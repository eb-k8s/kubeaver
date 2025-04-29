const fs = require('fs');
const path = require('path');
const os = require('os')
const Redis = require('ioredis');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const { getHostsYamlFile } = require('./getHostsYamlFile');

const redisConfig = {
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT,
};

const redis = new Redis(redisConfig);

async function getRedis(id) {
  const clusterKey = `k8s_cluster:${id}:baseInfo`;
  let clusterInfo
  try {
    clusterInfo = await redis.hgetall(clusterKey);
  } catch (error) {
    console.log(error)
  }
  const [networkPlugin, networkVersion] = clusterInfo.networkPlugin.split(' - ');
  const formattedInfo = {
    clusterName: clusterInfo.clusterName,
    k8sVersion: clusterInfo.version,
    networkPlugin: networkPlugin,
    networkVersion: networkVersion,
    clusterId: clusterInfo.clusterId || '',
    hosts: []
  };
  // 查询所有节点信息
  let nodehash = `k8s_cluster:${id}:hosts:*`

  const nodeKeys = await redis.keys(nodehash);
  for (const nodeKey of nodeKeys) {
    const nodeInfo = await redis.hgetall(nodeKey);
    //增加根据ip，用户名，查询主机密码，然后设置进去
    let hosthash = `host:${nodeInfo.ip}`
    const hostInfo = await redis.hgetall(hosthash);
    formattedInfo.hosts.push({
      ip: nodeInfo.ip,
      user: hostInfo.user,
      hostName: nodeInfo.hostName,
      password: hostInfo.password,
      role: nodeInfo.role,
      k8sVersion: nodeInfo.k8sVersion,
      status: nodeInfo.status
    });
  }
  return formattedInfo;
}

async function getConfigFile(id, hostPath, masterIP) {
  //查询密码
  let hosthash = `host:${masterIP}`
  const hostInfo = await redis.hgetall(hosthash);
  let parsedData
  // 如果 hostPath 为空，调用 getHostsYamlFile 获取
  if (!hostPath) {
    try {
      const resultData = await getRedis(id); // 假设 getRedis 函数可以返回必要的信息
      hostPath = await getHostsYamlFile(resultData, id);
    } catch (error) {
      console.error(`获取 hostPath 时出错: ${error.message}`);
      return; // 如果获取 hostPath 失败，退出函数
    }
  }
  // 如果 masterIP 为空，从 resultData 中获取
  if (!masterIP) {
    try {
      const resultData = await getRedis(id);
      for (const node of resultData.hosts) {
        if (node.role === "master") {
          masterIP = node.ip;
          break; // 找到 master 节点后退出循环
        }
      }
      if (!masterIP) {
        console.error('未找到 master 节点的 IP');
        return; // 如果未找到 masterIP，退出函数
      }
    } catch (error) {
      console.error(`获取 masterIP 时出错: ${error.message}`);
      return; // 如果获取 masterIP 失败，退出函数
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-'));
  const outputPath = path.join(tmpDir, 'config');
  const privateKeyPath = path.join(__dirname, '../ssh', 'id_rsa');
  const ansibleCommand = `ansible kube_control_plane[0] --private-key ${privateKeyPath} -i ${hostPath} -m fetch -a "src=/etc/kubernetes/admin.conf dest=${outputPath} flat=yes" -b`;
  //console.log(outputPath)
  try {
    await new Promise((resolve, reject) => {
      exec(ansibleCommand, (error, stdout, stderr) => {
        // console.log(stdout)
        if (error) {
          //console.log("config文件不存在")
          return reject(`执行命令时出错: ${error.message}`);
        }
        if (stderr) {
          console.error(`错误输出: ${stderr}`);
        }
        resolve();
      });
    });
  } catch (error) {
    //console.error('执行命令时出错:', error.message || '配置文件不存在');
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('清理临时目录时出错:', cleanupError.message);
    }
    return;
  }
  try {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`配置文件${outputPath}不存在`);
    }
    const fileContents = fs.readFileSync(outputPath, 'utf8');
    // 解析 YAML
    parsedData = yaml.load(fileContents);
    const newServerValue = `https://${masterIP}:6443`;
    if (parsedData.clusters) {
      parsedData.clusters.forEach(cluster => {
        if (cluster.cluster && cluster.cluster.server) {
          cluster.cluster.server = newServerValue; // 更新 server 字段
        }
      });
    } else {
      console.log('没有找到 clusters 字段。');
    }
    const newYaml = yaml.dump(parsedData);
    //fs.writeFileSync(outputPath, newYaml, 'utf8');
    //将config文件存入数据库
    // 将更新后的文件内容存储到 Redis（同步）
    const configHashKey = `k8s_cluster:${id}:config`
    redis.set(configHashKey, newYaml, (redisError) => {
      if (redisError) {
        console.error(`存储到 Redis 时出错: ${redisError.message}`);
        return;
      }
      //console.log('配置文件已成功存储到 Redis！');
    });
  } catch (error) {
    //console.error('读取配置文件时发生错误:', error.message || '配置文件不存在');
    return;
  }
}

async function getNodeStatus(id, hostName, hostPath, masterIP) {
  const configHashKey = `k8s_cluster:${id}:config`;

  try {
    let configContent = await redis.get(configHashKey);
    if (!configContent) {
      //console.error(`未找到${configHashKey}配置内容，尝试获取配置文件`);
      await getConfigFile(id, hostPath, masterIP);
      configContent = await redis.get(configHashKey);
      if (!configContent) {
        console.error(`获取集群${id}配置文件失败`);
        //return "Unknown";
        return { status: "Unknown", version: "Unknown" };
      }
    }

    const configFilePath = path.join(os.tmpdir(), `config-${id}`);
    fs.writeFileSync(configFilePath, configContent, 'utf8');

    const result = await new Promise((resolve, reject) => {
      exec(`kubectl --kubeconfig ${configFilePath} get node ${hostName}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`执行错误: ${error.message}`);
          //return resolve("Unknown");
          return resolve({ status: "Unknown", version: "Unknown" });
        }
        if (stderr) {
          console.error(`错误输出: ${stderr}`);
          //return resolve("Unknown");
          return resolve({ status: "Unknown", version: "Unknown" });
        }
        const lines = stdout.split('\n');
        const status = lines
          .filter(line => !line.includes('STATUS') && line.trim() !== '')
          .map(line => line.split(/\s+/)[1])
          .join(' ');
        const version = lines
          .filter(line => !line.includes('VERSION') && line.trim() !== '')
          .map(line => line.split(/\s+/)[4])
          .join(' ');
        //console.log(version)
        //resolve(status);
        resolve({ status, version });
      });
    });

    //return status;
    return result;
  } catch (error) {
    //console.error(`处理节点状态时出错: ${error}`);
    //return "Unknown";
    return { status: "Unknown", version: "Unknown" };
  }
}

module.exports = {
  getNodeStatus,
  getRedis,
  getConfigFile,
};