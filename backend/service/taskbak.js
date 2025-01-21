const util = require('util');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Redis = require('ioredis');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const Bull = require('bull');
const os = require('os');
const moment = require('moment');
const { addTaskToQueue } = require('../utils/ansibleQueue');
//const k8s = require('@kubernetes/client-node');

//redis一直处于连接
const redis = new Redis({
  port: 53857,
  host: "10.1.70.62",
  password: "1qaz@WSX",
});
// 存储正在运行的子进程
const runningProcesses = {};
// Redis Pub/Sub 客户端
const subscriber = new Redis({
  port: 58191,
  host: "10.1.70.62",
  password: "1qaz@WSX",
});



//定义获取集群状态函数
async function getNodeStatus(id, hostName) {
  const configPath = await getConfigFile(id, hostName);
  return new Promise((resolve, reject) => {
    // 执行 kubectl 命令
    exec(`kubectl --kubeconfig ${configPath} get node ${hostName}`, (error, stdout, stderr) => {
      if (error) {
        return reject(`执行错误: ${error.message}`);
      }
      if (stderr) {
        return reject(`错误输出: ${stderr}`);
      }
      // 处理输出
      const lines = stdout.split('\n');
      // 过滤掉包含 STATUS 的行，并提取第二列
      const status = lines
        .filter(line => !line.includes('STATUS') && line.trim() !== '')
        .map(line => line.split(/\s+/)[1])
        .join(' ');
      resolve(status);
      return status
    });
  });
}


//查询redis 数据
async function getRedis(id) {
  const clusterKey = `k8s_cluster:${id}:baseInfo`;
  let clusterInfo
  try {
    clusterInfo = await redis.hgetall(clusterKey);
  } catch (error) {
    console.log(error)
  }
  const formattedInfo = {
    clusterName: clusterInfo.clusterName,
    hosts: []
  };
  // 查询所有节点信息
  let nodehash = `k8s_cluster:${id}:hosts:*`
  const nodeKeys = await redis.keys(nodehash);
  for (const nodeKey of nodeKeys) {
    const nodeInfo = await redis.hgetall(nodeKey);
    formattedInfo.hosts.push({
      ip: nodeInfo.ip,
      hostName: nodeInfo.hostName,
      role: nodeInfo.role,
      status: nodeInfo.status
    });
  }
  return formattedInfo;
}

//查找具体的某个任务的哈希值,prefix 'k8s_cluster:test:tasks:' suffix  '123456789'  
async function findHashKeys(prefix, suffix) {
  const nodekey = []; // 存储找到的哈希键
  let cursor = '0';
  do {
    // 使用 SCAN 命令查找所有匹配的键
    const result = await redis.scan(cursor, 'MATCH', `${prefix}*`);
    cursor = result[0]; // 更新游标
    const foundKeys = result[1]; // 找到的键
    // 检查每个键是否包含 IP 部分
    for (const key of foundKeys) {
      if (key.includes(suffix)) {
        nodekey.push(key); // 添加到结果中
      }
    }
  } while (cursor !== '0'); // 直到游标返回到 0
  return nodekey;
}

//获取redis中的输出数据
async function getTaskOutput(id, ip, timeID) {
  const prefix = `k8s_cluster:${id}:tasks:${ip}`;
  const suffix = `${timeID}`;
  const hashKeys = await findHashKeys(prefix, suffix);
  // 从 Redis 查询数据
  const output = await redis.hgetall(hashKeys[0]);
  if (output) {
    return output; // 返回 stdout 输出  
  } else {
    throw new Error('Task output not found');
  }
}

const clients = new Map();

// 处理 WebSocket 连接
wss.on('connection', async (ws, req) => {
  //wscat -c ws://10.1.35.91:8080/2ohqucd7/10.1.69.235/1726220550129  
  // 从 URL 中提取 id、时间戳 和 IP 地址
  const urlParts = req.url.split('/').filter(Boolean); // 过滤空值
  const id = urlParts[0];
  const ip = urlParts[1];
  const timeID = urlParts[2];
  clients.set(ip, ws);

  // 从 Redis 获取该 IP 相关的数据并发送给客户端
  const data = await getTaskOutput(id, ip, timeID);
  ws.send(data.stdout);
  // 订阅 Redis 频道
  const channel = `k8s_cluster:${id}:tasks:${ip}:${data.task}:${timeID}`;
  subscriber.subscribe(channel);
  subscriber.on('message', (chan, message) => {
    if (chan === channel) {
      console.log(`Sending message to WebSocket client: ${message}`)
      ws.send(message); // 发送更新数据
    }
  });

  ws.on('close', () => {
    clients.delete(ip);
    subscriber.unsubscribe(channel); // 取消订阅
  });
});

// 发布更新到 Redis
async function publishTaskOutput(nodeKey, output) {
  //const channel = `nodeKey`;
  await redis.publish(nodeKey, output);
}

//生成相应hosts.yaml 文件
async function getHostsYamlFile(data) {
  // 组织 YAML 数据
  const hosts = {};
  const kubeControlPlane = { hosts: {} };
  const kubeNode = { hosts: {} };
  const etcdHosts = { hosts: {} };
  // 遍历 clusterInfo.roles，构建 hosts 和子角色
  data.hosts.forEach((roleInfo) => {
    const { ip, hostName, role } = roleInfo;
    // 添加到 hosts 中
    hosts[hostName] = {
      ansible_host: ip,
      ip: ip,
      access_ip: ip
    };

    // 根据角色组织子角色
    if (role === 'master') {
      kubeControlPlane.hosts[hostName] = {};
      // 同时将 master 添加到 etcd 的 hosts 中
      etcdHosts.hosts[hostName] = {};
    } else if (role === 'node') {
      kubeNode.hosts[hostName] = {};
    }
  });

  // 构建最终的 YAML 数据结构
  const yamlData = {
    all: {
      hosts: hosts,
      children: {
        kube_control_plane: kubeControlPlane,
        kube_node: kubeNode,
        etcd: etcdHosts,
        k8s_cluster: {
          children: {
            kube_control_plane: {},
            kube_node: {}
          }
        },
        calico_rr: {
          hosts: {}
        }
      }
    }
  };

  // 将数据转换为 YAML 格式
  const yamlStr = yaml.dump(yamlData);
  // 指定保存路径(离线部署替换掉相应hosts.yaml文件)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-'));
  const outputPath = path.join(tmpDir, 'hosts.yaml');
  fs.writeFileSync(outputPath, yamlStr, 'utf8');
  return outputPath;
}

//获取集群的证书文件,将文件保存在数据库中
//ansible kube_control_plane[0] -i ./kubespray-2.26.0/inventory/sample/hosts.yaml -m fetch -a "src=/etc/kubernetes/admin.conf dest=./out_files/config flat=yes"

async function getConfigFile(id, hostName) {
  let parsedData
  let nodeIP
  const resultData = await getRedis(id)
  //获取hosts.yaml文件
  const hostPath = await getHostsYamlFile(resultData)
  for (const node of resultData.hosts) {
    if (node.hostName === hostName) {
      nodeIP = node.ip
    }
  }
  configName = `config-${hostName}`
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-'));
  const outputPath = path.join(tmpDir, configName);
  const ansibleCommand = `ansible kube_control_plane[0] -i ${hostPath} -m fetch -a "src=/etc/kubernetes/admin.conf dest=${outputPath} flat=yes"`;
  console.log(outputPath)
  await new Promise((resolve, reject) => {
    exec(ansibleCommand, (error, stdout, stderr) => {
      if (error) {
        return reject(`执行命令时出错: ${error.message}`);
      }
      if (stderr) {
        console.error(`错误输出: ${stderr}`);
      }
      resolve();
    });
  });

  const fileContents = fs.readFileSync(outputPath, 'utf8');
  // 解析 YAML
  parsedData = yaml.load(fileContents);
  const newServerValue = `https://${nodeIP}:6443`;
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
  fs.writeFileSync(outputPath, newYaml, 'utf8');
  //将config文件存入数据库
  // 将更新后的文件内容存储到 Redis（同步）
  const configHashKey = `k8s_cluster:${id}:${configName}`
  redis.set(configHashKey, newYaml, (redisError) => {
    if (redisError) {
      console.error(`存储到 Redis 时出错: ${redisError.message}`);
      return;
    }
    console.log('配置文件已成功存储到 Redis！');
  });
  return outputPath;  //返回文件路径 
}

// 添加master1任务到队列的函数,master1执行完之后开始并行执行所有node节点
async function addK8sMasterJob(id) {
  //先通过集群名称查询redis表
  console.log("添加master")
  let resultData
  try {
    resultData = await getRedis(id)
  } catch (error) {
    console.error('从 Redis 获取数据时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '获取集群信息失败',
      status: "error"
    };
  }
  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData)
    console.log("添加master任务" + hostsPath)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }

  try {
    const createTime = moment().format('YYYY-MM-DD HH:mm:ss');
    //添加master和etc 任务
    for (const node of resultData.hosts) {
      if (node.role === "master") {
        taskName = 'initCluster'
        const playbook = {
          id: id,
          task: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0/cluster.yml',
          clusterName: resultData.clusterName,
          taskName: taskName,
          hostName: node.hostName,
          role: node.role,
          ip: node.ip,
          hostsPath: hostsPath
        }
        await addTaskToQueue(id, playbook);
        //任务添加之后修改数据库中baseInfo集群部署状态为Deploying
        const baseHashKey = `k8s_cluster:${id}:baseInfo`;
        const clusterInfo = await redis.hgetall(baseHashKey);

        await redis.hset(baseHashKey,
          'clusterName', resultData.clusterName,
          'version', clusterInfo.version,
          'offlinePackage', clusterInfo.offlinePackage,
          'deploymentStatus', 'Deploying',//部署中状态,任务执行失败，要更新数据表状态
          'status', 'NotReady',
          'createTime', createTime
        );
        //查找相应的节点，修改节点状态
        const nodeKey = `k8s_cluster:${id}:hosts:${node.ip}`;
        await redis.hset(nodeKey,
          'ip', node.ip,
          'hostName', node.hostName,
          'role', node.role,
          'deploymentStatus', 'Deploying',//部署中状态
          'status', 'NotReady',//集群实际状态
          'createTime', createTime
        );
      }
      //如果node也存在，node状态应该是等待中

      if (node.role === "node") {
        const nodeKey = `k8s_cluster:${id}:hosts:${node.ip}`;
        await redis.hset(nodeKey,
          'ip', node.ip,
          'hostName', node.hostName,
          'role', node.role,
          'deploymentStatus', 'Waiting',//等待中状态
          'status', 'NotReady',//集群实际状态
          'createTime', createTime
        );
      }
    }
  } catch (error) {
    console.error('添加任务到队列时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '添加任务失败',
      status: "error"
    };
  }

  //任务开始执行
  ansibleQueue.process(5, async (job) => {
    console.log("---------当前任务id------------", job.id)
    return new Promise((resolve, reject) => {
      const args = [
        '-i', `${job.data.playbook.hostsPath}`,
        '-M', 'plugins/modules',
        '--become',
        '--become-user=root', job.data.playbook.task,
        '--extra-vars', '@/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/config.yml',
        '--limit', job.data.playbook.hostName
      ]
      console.log(args)
      const ansibleProcess = spawn('ansible-playbook', args, {
        cwd: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0' // 设置工作目录
      });
      runningProcesses[job.id] = ansibleProcess;

      ansibleProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output); // 输出到控制台
        const currenttime = currentTime();
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
        redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
          if (err) {
            console.error('Error retrieving existing output from Redis:', err);
            return reject(new Error('获取输出失败'));
          }
          const newOutput = existingOutput ? existingOutput + output : output;
          redis.hset(nodeKey,
            'jobID', job.id,
            'task', job.data.playbook.taskName,
            'ip', job.data.playbook.ip,
            'role', job.data.playbook.role,
            'hostName', job.data.playbook.hostName,
            'stdout', newOutput,
            'createTime', currenttime,
            'status', 'working'
          );
          publishTaskOutput(nodeKey, newOutput);
        });
      });

      ansibleProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      ansibleProcess.on('close', (code, signal) => {
        delete runningProcesses[job.id];
        if (signal) {
          console.log(`子进程被信号--- ${signal} 终止`);
          reject(new Error(`进程被信号 ${signal} 终止`));
        } else {
          console.log(`子进程退出，退出码 ${code}`);
          if (code === 0) {
            console.log(`任务 ${job.id} 成功完成`);
            resolve();
          } else {
            console.error(`任务---- ${job.id} 失败，退出码 ${code}`);
            reject(new Error(`进程退出，退出码 ${code}`));
          }
        }
      });
    });
  });

  //master 任务完成之后，添加node 任务
  ansibleQueue.on('completed', async (job, result) => {
    try {
      const createTime = moment().format('YYYY-MM-DD HH:mm:ss');
      if (job.data.playbook.role === 'master') {
        //更新任务状态

        //更新集群状态，此时master部署状态变成已部署
        const baseHashKey = `k8s_cluster:${id}:baseInfo`;
        const clusterInfo = await redis.hgetall(baseHashKey);

        const k8sStatus = await getNodeStatus(id, job.data.playbook.hostName)
        console.log("k8s集群状态-------" + k8sStatus)
        await redis.hset(baseHashKey,
          'clusterName', clusterInfo.clusterName,
          'version', clusterInfo.version,
          'offlinePackage', clusterInfo.offlinePackage,
          'deploymentStatus', 'Deployed',//部署完成
          'status', k8sStatus,//该状态需要调k8s接口判断
          'createTime', createTime
        );
        //节点状态也要更新
        const nodeKey = `k8s_cluster:${id}:hosts:${job.data.playbook.ip}`;
        await redis.hset(nodeKey,
          'ip', job.data.playbook.ip,
          'hostName', job.data.playbook.hostName,
          'role', job.data.playbook.role,
          'deploymentStatus', 'Deployed',//部署中状态
          'status', k8sStatus,//集群实际状态
          'createTime', createTime
        );

        //所有node都加入job
        const nodeJobs = resultData.hosts
        for (const node of nodeJobs) {
          if (node.role === "node") {
            taskName = `addNode`
            const playbook = {
              //ansible-playbook scale.yml -b -i inventory/mycluster/hosts.yaml -e kube_version=v1.30.3 --limit node2
              task: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0/scale.yml',
              id: id,
              clusterName: resultData.clusterName,
              taskName: taskName,
              role: node.role,
              hostName: node.hostName,
              ip: node.ip,
              hostsPath: hostsPath
            }
            await ansibleQueue.add({ playbook })
            //只需要更新节点本身状态即可
            const itemNodeKey = `k8s_cluster:${id}:hosts:${node.ip}`;
            await redis.hset(itemNodeKey,
              'ip', node.ip,
              'hostName', node.hostName,
              'role', node.role,
              'deploymentStatus', 'Deploying',//部署中状态
              'status', 'NotReady',//集群实际状态
              'createTime', createTime
            );
          }
        }
      }
      if (job.data.playbook.role === 'node') {
        //设置节点状态
        const k8sStatus = await getNodeStatus(id, job.data.playbook.hostName)
        const nodeKey = `k8s_cluster:${id}:hosts:${job.data.playbook.ip}`;
        await redis.hset(nodeKey,
          'ip', job.data.playbook.ip,
          'hostName', job.data.playbook.hostName,
          'role', job.data.playbook.role,
          'deploymentStatus', 'Deployed',//部署中状态
          'status', k8sStatus,//集群实际状态
          'createTime', createTime
        );
      }

    } catch (error) {
      console.error('Error processing completed job:', error);
    }
  });

  ansibleQueue.on('failed', async (job, err) => {
    console.log("-----------------------------------------任务执行失败")
    const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
    const clusterInfo = await redis.hgetall(baseHashKey);
    const createTime = moment().format('YYYY-MM-DD HH:mm:ss');
    await redis.hset(baseHashKey,
      'clusterName', clusterInfo.clusterName,
      'version', clusterInfo.version,
      'offlinePackage', clusterInfo.offlinePackage,
      'deploymentStatus', 'NotDeploy',//任务失败，未部署状态
      'status', 'NotReady',
      'createTime', createTime
    );
    //同理节点状态也要相应的更新
    const itemKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
    await redis.hset(itemKey,
      'ip', job.data.playbook.ip,
      'hostName', job.data.playbook.hostName,
      'role', job.data.playbook.role,
      'deploymentStatus', 'NotDeploy',//未部署状态
      'status', 'NotReady',//集群实际状态
      'createTime', createTime
    );
    console.error(`任务${job.id}失败: ${err.message}`);
  });

  return {
    code: 20000,
    msg: '任务已成功添加到队列',
    status: "ok"
  };

}









//添加node任务到队列
async function addK8sNodeJob(clusterInfo) {
  const id = clusterInfo.id
  let resultData
  let hostsPath
  try {
    resultData = await getRedis(id)
  } catch (error) {
    console.error('从 Redis 获取数据时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '获取集群信息失败',
      status: "error"
    };
  }

  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData)
    console.log("node 的hostspath" + hostsPath)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }

  const ansibleQueue = new Bull(id, {
    redis: {
      port: 58191,
      host: "10.1.70.62",
      password: "1qaz@WSX",
    },
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      backoff: false,
      delay: 0
    },
  });
  //添加node节点任务
  try {
    for (const node of clusterInfo.hosts) {
      if (node.role === "node") {
        taskName = `addNode`
        const playbook = {
          task: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0/scale.yml',
          id: id,
          clusterName: resultData.clusterName,
          taskName: taskName,
          hostName: node.hostName,
          role: node.role,
          ip: node.ip,
          hostsPath: hostsPath
        }
        await ansibleQueue.add({ playbook });
        //修改节点状态
        const itemNodeKey = `k8s_cluster:${id}:hosts:${node.ip}`;
        await redis.hset(itemNodeKey,
          'ip', node.ip,
          'hostName', node.hostName,
          'role', node.role,
          'deploymentStatus', 'Deploying',//部署中状态
          'status', 'NotReady',//集群实际状态
          'createTime', createTime
        );
      }
    }
  } catch (error) {
    console.error('添加节点任务到队列时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '添加任务失败',
      status: "error"
    };
  }


  //任务开始执行
  ansibleQueue.process(5, async (job) => {
    return new Promise((resolve, reject) => {
      console.log("---------node 任务------------", job.id)
      let args = [
        '-i', `${job.data.playbook.hostsPath}`,
        '-M', 'plugins/modules',
        '--become',
        '--become-user=root', job.data.playbook.task,
        '--extra-vars', '@/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/config.yml',
        '--limit', job.data.playbook.hostName
      ]
      console.log("node参数配置" + args)
      const ansibleProcess = spawn('ansible-playbook', args, {
        cwd: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0' // 设置工作目录
      });
      runningProcesses[job.id] = ansibleProcess;
      // 处理标准输出
      ansibleProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output); // 输出到控制台

        const createTime = currentTime()
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
        redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
          if (err) {
            console.error('Error retrieving existing output from Redis:', err);
            return;
          }
          const newOutput = existingOutput ? existingOutput + output : output;
          redis.hset(nodeKey, 'jobID', job.id, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role, 'hostName', job.data.playbook.hostName, 'stdout', newOutput, 'createTime', createTime);
          // 发布更新到 Redis
          publishTaskOutput(nodeKey, newOutput);
        });
      });

      ansibleProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      ansibleProcess.on('close', (code, signal) => {
        delete runningProcesses[job.id];
        if (signal) {
          console.log(`子进程被信号 ${signal} 终止`);
          reject(new Error(`进程被信号 ${signal} 终止`));
        } else {
          console.log(`子进程退出，退出码 ${code}`);
          if (code === 0) {
            console.log(`任务 ${job.id} 成功完成`);
            resolve();
          } else {
            console.error(`任务 ${job.id} 失败，退出码 ${code}`);
            reject(new Error(`进程退出，退出码 ${code}`));
          }
        }
      });
    });
  });

  ansibleQueue.on('completed', async (job, result) => {
    console.log(`任务${job.id}执行成功`)
    //设置节点状态
    const k8sStatus = await getNodeStatus(id, job.data.playbook.hostName)
    const nodeKey = `k8s_cluster:${id}:hosts:${job.data.playbook.ip}`;
    await redis.hset(nodeKey,
      'ip', job.data.playbook.ip,
      'hostName', job.data.playbook.hostName,
      'role', job.data.playbook.role,
      'deploymentStatus', 'Deployed',//部署中状态
      'status', k8sStatus,//集群实际状态
      'createTime', createTime
    );


  });
  ansibleQueue.on('failed', async (job, err) => {
    const itemKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
    await redis.hset(itemKey,
      'ip', job.data.playbook.ip,
      'hostName', job.data.playbook.hostName,
      'role', job.data.playbook.role,
      'deploymentStatus', 'NotDeploy',//未部署状态
      'status', 'NotReady',//集群实际状态
      'createTime', createTime
    );
    console.error(`任务${job.id}失败: ${err.message}`);
  });

  return {
    code: 20000,
    data: '',
    msg: "节点任务添加成功",
    status: "ok"
  };
}

//将node节点移出集群
async function removeK8sNodeJob(id, ip) {
  //先查询所属的集群,该节点角色
  let resultData;
  try {
    resultData = await getRedis(id)
  } catch (error) {
    console.error('从 Redis 获取数据时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '获取集群信息失败',
      status: "error"
    };
  }
  const foundHost = resultData.hosts.find(host => host.ip === ip);
  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }

  const ansibleQueue = new Bull(id, {
    redis: {
      port: 58191,
      host: "10.1.70.62",
      password: "1qaz@WSX",
    },
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      backoff: false,
      delay: 0
    },
  });
  try {
    taskName = `resetNode`
    const playbook = {
      task: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0/remove-node.yml',
      id: id,
      clusterName: resultData.clusterName,
      taskName: taskName,
      hostName: foundHost.hostName,
      role: foundHost.role,
      ip: foundHost.ip
    }
    await ansibleQueue.add({ playbook });
    //更新节点状态
    const itemNodeKey = `k8s_cluster:${id}:hosts:${node.ip}`;
    await redis.hset(itemNodeKey,
      'ip', foundHost.ip,
      'hostName', foundHost.hostName,
      'role', foundHost.role,
      'deploymentStatus', 'Reseting',//卸载状态
      'status', 'NotReady',//集群实际状态
      'createTime', createTime
    );


  } catch (error) {
    console.error('添加删除节点任务到队列时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '添加删除节点任务失败',
      status: "error"
    };
  }

  //任务开始执行
  ansibleQueue.process(5, async (job) => {
    return new Promise((resolve, reject) => {
      console.log("---------移除任务------------", job.id)
      const ansibleProcess = spawn('ansible-playbook', [
        '-i', `${hostsPath}`,
        '-M', 'plugins/modules',
        '--become',
        '--become-user=root', job.data.playbook.task,
        '--extra-vars', '@/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/config.yml',
        '--extra-vars', "skip_confirmation=true",
        '-e', `node=${job.data.playbook.hostName}`
      ], {
        cwd: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0' // 设置工作目录
      });
      runningProcesses[job.id] = ansibleProcess;
      // 处理标准输出
      ansibleProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output); // 输出到控制台

        const createTime = currentTime()
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
        redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
          if (err) {
            console.error('Error retrieving existing output from Redis:', err);
            return;
          }
          const newOutput = existingOutput ? existingOutput + output : output;
          redis.hset(nodeKey, 'jobID', job.id, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role, 'stdout', newOutput, 'createTime', createTime);
          // 发布更新到 Redis
          publishTaskOutput(nodeKey, newOutput);
        });
      });

      ansibleProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      ansibleProcess.on('close', (code, signal) => {
        delete runningProcesses[job.id];
        if (signal) {
          console.log(`子进程被信号 ${signal} 终止`);
          reject(new Error(`进程被信号 ${signal} 终止`));
        } else {
          console.log(`子进程退出，退出码 ${code}`);
          if (code === 0) {
            console.log(`任务 ${job.id} 成功完成`);
            resolve();
          } else {
            console.error(`任务 ${job.id} 失败，退出码 ${code}`);
            reject(new Error(`进程退出，退出码 ${code}`));
          }
        }
      });
    });
  });

  ansibleQueue.on('completed', async (job, result) => {
    //更新节点状态
    const nodeKey = `k8s_cluster:${id}:hosts:${job.data.playbook.ip}`;
    await redis.hset(nodeKey,
      'ip', job.data.playbook.ip,
      'hostName', job.data.playbook.hostName,
      'role', job.data.playbook.role,
      'deploymentStatus', 'NotDeploy',//部署中状态
      'status', 'NotReady',//集群实际状态
      'createTime', createTime
    );
    console.log(`任务${job.id}执行成功`)
  });
  ansibleQueue.on('failed', async (job, err) => {
    console.error(`任务${job.id}失败: ${err.message}`);
  });

  return {
    code: 20000,
    msg: "删除节点任务添加成功",
    status: "ok"
  };
}

//终止任务
async function stopK8sClusterJob(parameter) {
  const prefix = `k8s_cluster:${parameter.id}:tasks:${parameter.nodeIP}:`; // 已知的前缀
  const suffix = `${parameter.timestamp}`; // 已知的 IP 部分
  const hashKeys = await findHashKeys(prefix, suffix)
  const output = await redis.hgetall(hashKeys[0]);
  const processToKill = runningProcesses[output.jobID];
  if (processToKill) {
    processToKill.kill('SIGTERM');
    delete runningProcesses[output.jobID];
    return {
      code: 20000,
      data: '',
      msg: "任务终止成功",
      status: "ok"
    };
  } else {
    console.log("error")
  }
}

//重置集群任务
async function resetK8sClusterJob(id) {
  console.log("重置任务")
  let resultData
  let hostsPath
  try {
    resultData = await getRedis(id)
  } catch (error) {
    console.log(error)
  }
  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData)
    console.log("reset------- 的hostspath" + hostsPath)

  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
  //创建队列
  const ansibleQueue = new Bull(id, {
    redis: {
      port: 58191,
      host: "10.1.70.62",
      password: "1qaz@WSX",
    },
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      backoff: false,
      delay: 0
    },
  });
  //任务开始执行
  ansibleQueue.process(5, async (job) => {
    return new Promise((resolve, reject) => {
      console.log("---------重置任务------------", job.id)
      const ansibleProcess = spawn('ansible-playbook', [
        '-i', `${job.data.playbook.hostsPath}`,
        '--become',
        '--become-user=root', job.data.playbook.task,
        '--extra-vars', '@/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/config.yml',
        '--extra-vars', 'skip_confirmation=true',
        '--extra-vars', "reset_confirmation=true",
        '--extra-vars', "reset_confirmation_prompt.user_input=yes"
      ], {
        cwd: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0'
      });
      runningProcesses[job.id] = ansibleProcess;

      ansibleProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output); // 输出到控制台
        const currenttime = currentTime();
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
        redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
          if (err) {
            console.error('Error retrieving existing output from Redis:', err);
            return;
          }
          const newOutput = existingOutput ? existingOutput + output : output;
          redis.hset(nodeKey, 'jobID', job.id, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role, 'stdout', newOutput, 'createTime', currenttime);
          publishTaskOutput(nodeKey, newOutput);
        });
      });

      ansibleProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      ansibleProcess.on('close', (code, signal) => {
        delete runningProcesses[job.id];
        if (signal) {
          console.log(`子进程被信号 ${signal} 终止`);
          reject(new Error(`进程被信号 ${signal} 终止`));
        } else {
          console.log(`子进程退出，退出码 ${code}`);
          if (code === 0) {
            console.log(`任务 ${job.id} 成功完成`);
            resolve();
          } else {
            console.error(`任务 ${job.id} 失败，退出码 ${code}`);
            reject(new Error(`进程退出，退出码 ${code}`));
          }
        }
      });
    });
  });
  //添加重置任务
  for (const node of resultData.hosts) {
    if (node.role === "master") {
      taskName = 'resetCluster'
      const playbook = {
        id: id,
        task: '/tempdata/wn/kubeaver/data/offline/spray-2.26.0-k8s-1.28.12_amd/kubespray-2.26.0/reset.yml',
        clusterName: resultData.clusterName,
        taskName: taskName,
        hostName: node.hostName,
        role: node.role,
        ip: node.ip,
        hostsPath: hostsPath
      }
      await ansibleQueue.add({ playbook });
      //修改集群状态，卸载中
      const baseHashKey = `k8s_cluster:${id}:baseInfo`;
      const clusterInfo = await redis.hgetall(baseHashKey);
      const createTime = moment().format('YYYY-MM-DD HH:mm:ss');
      await redis.hset(baseHashKey,
        'clusterName', resultData.clusterName,
        'version', clusterInfo.version,
        'offlinePackage', clusterInfo.offlinePackage,
        'deploymentStatus', 'Reseting',//卸载中
        'status', 'NotReady',
        'createTime', createTime
      );
      //查找相应的节点，修改节点状态
      const nodeKey = `k8s_cluster:${id}:hosts:${node.ip}`;
      await redis.hset(nodeKey,
        'ip', node.ip,
        'hostName', node.hostName,
        'role', node.role,
        'deploymentStatus', 'Reseting',//部署中状态
        'status', 'NotReady',//集群实际状态
        'createTime', createTime
      );

    }
  }


  ansibleQueue.on('completed', async (job, result) => {
    const baseHashKey = `k8s_cluster:${id}:baseInfo`;
    const clusterInfo = await redis.hgetall(baseHashKey);
    const createTime = moment().format('YYYY-MM-DD HH:mm:ss');
    //const K8sStatus = getNodeStatus(job.data.playbook.hostName)
    //console.log("k8s集群状态-------" + K8sStatus)
    await redis.hset(baseHashKey,
      'clusterName', clusterInfo.clusterName,
      'version', clusterInfo.version,
      'offlinePackage', clusterInfo.offlinePackage,
      'deploymentStatus', 'NotDeployed',//部署完成
      'status', 'NotReady',//该状态需要调k8s接口判断
      'createTime', createTime
    );
    //节点状态也要更新
    const nodeKey = `k8s_cluster:${id}:hosts:${job.data.playbook.ip}`;
    await redis.hset(nodeKey,
      'ip', job.data.playbook.ip,
      'hostName', job.data.playbook.hostName,
      'role', job.data.playbook.role,
      'deploymentStatus', 'NotDeploy',//部署中状态
      'status', 'NotReady',//集群实际状态
      'createTime', createTime
    );
    console.log(`任务${job.id}执行成功`)
  });

  ansibleQueue.on('failed', async (job, err) => {
    console.error(`任务${job.id}失败: ${err.message}`);
  });

  return {
    code: 20000,
    msg: "重置集群任务添加成功",
    status: "ok"
  };
}

//获取任务列表
async function getK8sClusterTaskList(id) {
  let nodehash = `k8s_cluster:${id}:tasks:*`
  let nodeKeys
  try {
    nodeKeys = await redis.keys(nodehash);
  } catch (error) {
    console.log(error)
  }
  const result = {
    id: id,
    hosts: [],
    tasks: []
  };
  const taskRegex = /tasks:(.*?):(.*?):(.*)/;
  const taskMap = {};
  nodeKeys.forEach(item => {
    const taskMatch = item.match(taskRegex);
    if (taskMatch) {
      const ip = taskMatch[1];
      const action = taskMatch[2];
      const taskId = parseInt(taskMatch[3], 10);
      if (!result.hosts.includes(ip)) {
        result.hosts.push(ip);
      }
      if (!taskMap[ip]) {
        taskMap[ip] = {};
      }
      if (!taskMap[ip][action]) {
        taskMap[ip][action] = [];
      }
      taskMap[ip][action].push(taskId);
    }
  });
  for (const ip in taskMap) {
    result.tasks.push({
      ip: ip,
      ...taskMap[ip]
    });
  }
  return {
    code: 20000,
    data: result,
    msg: "获取任务实例列表成功",
    status: "ok"
  };
}


module.exports = {
  addK8sMasterJob,
  addK8sNodeJob,
  stopK8sClusterJob,
  resetK8sClusterJob,
  removeK8sNodeJob,
  getK8sClusterTaskList,
}