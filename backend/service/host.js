const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const Redis = require('ioredis');

// 连接到 Redis 服务器
const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

// Redis key 的前缀
const HOSTS_PREFIX = 'host:';

// 检查主机连通性
async function pingHost(hostIP) {
  try {
    await execAsync(`ping -c 1 -W 2 ${hostIP}`);
    return true;
  } catch (error) {
    console.error(`无法 ping 通主机 ${hostIP}: ${error.message}`);
    return false;
  }
}

// 添加主机并立即返回
async function addHost(hostIP, hostPort, user, password) {
  // 检查主机是否可连通
  if (!(await pingHost(hostIP))) {
    return {
      code: 50000,
      data: "",
      msg: "主机无法 ping 通，无法添加！",
      status: "error"
    };
  }
  // 检查主机是否已存在
  const existingRecord = await redis.hgetall(`${HOSTS_PREFIX}${hostIP}`);
  if (Object.keys(existingRecord).length > 0) {
    return {
      code: 20000,
      data: existingRecord,
      msg: "主机已经存在，无需重复添加！",
      status: "ok"
    };
  }
  const publicKeyPath = path.join(__dirname, '../ssh', 'id_rsa.pub');
  const sshCommand = `sshpass -p '${password}' ssh-copy-id -i ${publicKeyPath} -o StrictHostKeyChecking=no -p ${hostPort} ${user}@${hostIP}`;
  try {
    // 执行 SSH 命令
    await execAsync(sshCommand);
  } catch (error) {
    return {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
  //同步获取详细信息
  let info = await fetchAndSaveHostDetails(hostIP, user);
  if (info && info.status === "error") {
    return {
      code: 50000,
      data: "",
      msg: info.msg,
      status: "error"
    };
  }

  try {
    const addtime = new Date().toLocaleString();
    const hostDetails = { hostIP, hostPort, user, password, addtime };
    const dataToStore = { ...hostDetails, ...info };
    // 将主机信息存储到 Redis
    await redis.hmset(`${HOSTS_PREFIX}${hostIP}`, dataToStore);
    return {
      code: 20000,
      data: dataToStore,
      msg: "主机添加成功",
      status: "ok"
    };
  } catch (error) {
    return {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
}

// 异步获取并保存主机详细信息
async function fetchAndSaveHostDetails(hostIP, user) {
  const playbookPath = path.join(__dirname, '../playbook/gather_system_info.yml');
  const remoteFilePath = `/tmp/system_info_${hostIP}.json`;
  const localFilePath = path.join(__dirname, `system_info_${hostIP}.json`);

  try {
    await runAnsiblePlaybook(hostIP, playbookPath, user);
  } catch (error) {
    console.error(`获取主机 ${hostIP} 信息时出错: ${error.message}`);
    return {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };

  }
  try {
    await fetchFileFromRemote(hostIP, remoteFilePath, localFilePath, user);
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`文件没有发现: ${localFilePath}`);
    }

    const jsonData = fs.readFileSync(localFilePath, 'utf8');
    const hostDetails = JSON.parse(jsonData);

    if (hostDetails.memory) {
      hostDetails.memory = Math.ceil(hostDetails.memory);
    }
    // 更新 Redis 中的主机信息 (哈希形式)
    //await redis.hmset(`${HOSTS_PREFIX}${hostIP}`, hostDetails);
    // 删除本地临时文件
    fs.unlinkSync(localFilePath);
    return hostDetails
  } catch (error) {
    console.error(`获取主机文件 ${hostIP} 失败: ${error.message}`);
    return {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
}

// 运行 Ansible Playbook
async function runAnsiblePlaybook(hostIP, playbookPath, user) {
  const privateKeyPath = path.join(__dirname, '../ssh', 'id_rsa');
  return new Promise((resolve, reject) => {
    exec(`ansible-playbook --private-key ${privateKeyPath} -e ansible_user=${user} -i ${hostIP}, ${playbookPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Playbook execution failed: ${error}`);
        reject(new Error(`Playbook 执行失败: ${error}`));
      } else {
        //console.log(`Playbook executed successfully: ${stdout}`);
        resolve(stdout);
      }
    });
  });
}

// 从远程获取文件
function fetchFileFromRemote(hostIP, remoteFilePath, localFilePath, user) {
  const privateKeyPath = path.join(__dirname, '../ssh', 'id_rsa');
  return new Promise((resolve, reject) => {
    exec(`scp -i ${privateKeyPath} ${user}@${hostIP}:${remoteFilePath} ${localFilePath}`, (error, stdout, stderr) => {
      if (error) reject(new Error(`从远程主机获取文件失败: ${stderr}`));
      else resolve(stdout);
    });
  });
}

// 获取未被使用的主机列表
async function getAvailableHosts() {
  try {
    const keys = await redis.keys(`${HOSTS_PREFIX}*`);
    const hosts = await Promise.all(keys.map(async key => {
      const hostData = await redis.hgetall(key);
      return hostData;
    }));

    const nodeKeys = await redis.keys(`k8s_cluster:*:hosts:*`);
    const nodes = [];
    for (const nodeKey of nodeKeys) {
      const nodeInfo = await redis.hgetall(nodeKey);
      const nodeIP = nodeKey.split(':')[3];
      nodes.push({
        ip: nodeIP,
        ...nodeInfo
      });
    }

    const availableHosts = hosts.filter(host => {
      return !nodes.some(node => node.ip === host.hostIP);
    });

    return {
      code: 20000,
      data: availableHosts,
      msg: "",
      status: "ok"
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      code: 50000,
      data: "",
      msg: error.message || 'Failed to retrieve hosts',
      status: "error"
    };
  }
}

// 获取主机列表
async function getHosts() {
  try {
    const keys = await redis.keys(`${HOSTS_PREFIX}*`);
    const hosts = await Promise.all(keys.map(async key => {
      const hostData = await redis.hgetall(key); // 获取哈希数据
      return hostData;
    }));

    return {
      code: 20000,
      data: hosts,
      msg: "",
      status: "ok"
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      code: 50000,
      data: "",
      msg: error.message || 'Failed to retrieve hosts',
      status: "error"
    };
  }
}

// 查询指定 hostID 的内容
async function getHostById(hostIP) {
  try {
    const hostKey = `${HOSTS_PREFIX}${hostIP}`;
    const hostData = await redis.hgetall(hostKey);

    if (Object.keys(hostData).length > 0) {
      return hostData;
    } else {
      throw new Error(`没有找到主机 ${hostIP}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// 删除主机
async function deleteHost(hostIP) {
  try {
    const hostKey = `${HOSTS_PREFIX}${hostIP}`;
    const hostExists = await redis.hgetall(hostKey);

    if (Object.keys(hostExists).length === 0) {
      throw new Error(`没有找到 ${hostIP} 主机的信息！`);
    }
    //查询是否存在节点key值,如果存在说明在使用
    const nodeKeys = await redis.keys(`k8s_cluster:*:hosts:${hostIP}`);
    if (nodeKeys.length > 0) {
      return {
        code: 40000,
        data: null,
        msg: `主机 ${hostIP} 正在使用中，无法删除！`,
        status: "error"
      };
    }
    // 删除 Redis 中的主机记录
    await redis.del(hostKey);
    //删除 known_hosts 主机
    try {
      await execAsync(`ssh-keygen -R ${hostIP}`);
      console.log(`已从 known_hosts 中删除主机 ${hostIP} 的信息。`);
    } catch (error) {
      console.error(`从 known_hosts 中删除主机 ${hostIP} 信息时出错: ${error.message}`);
    }
    return {
      code: 20000,
      data: null,
      msg: "主机删除成功！",
      status: "ok"
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      code: 50000,
      data: null,
      msg: error.message || '主机删除失败！',
      status: "error"
    };
  }
}

module.exports = {
  addHost,
  getHosts,
  deleteHost,
  getHostById,
  getAvailableHosts,
};
