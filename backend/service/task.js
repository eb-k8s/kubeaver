const util = require('util');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const Redis = require('ioredis');

//const wss = new WebSocket.Server({ port: 8800 });
const { addTaskToQueue, stopAnsibleQueue, getWaitingJobs, getActiveJobs, removeAllJobs, removeWaitingJobs } = require('../utils/ansibleQueue');
const { getHostsYamlFile } = require('../utils/getHostsYamlFile');
const { getRedis, getConfigFile, getNodeStatus } = require('../utils/getNodeStatus');
const { offlinePackagesPath } = require('../utils/getOfflinePackage')
//const k8s = require('@kubernetes/client-node');

const redisConfig = {
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT,
};

const redis = new Redis(redisConfig);

//ansible做任务之前删除同名hostname，路径/tmp/hostname
function deleteTmpHostnameSync(hostname) {
  const filePath = `/tmp/${hostname}`;
  try {
    fs.unlinkSync(filePath);
    console.log(`文件 ${filePath} 已成功删除。`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`文件 ${filePath} 不存在，无需删除。`);
    } else {
      console.error(`删除文件 ${filePath} 时出错:`, err.message);
    }
  }
}

// 添加master1任务到队列的函数,master1执行完之后开始并行执行所有node节点
async function addK8sMasterJob(clusterInfo) {
  const id = clusterInfo.id
  //先通过集群名称查询redis表
  let resultData
  try {
    resultData = await getRedis(id)
    console.log(resultData)
  } catch (error) {
    console.error('从 Redis 获取数据时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '获取集群信息失败',
      status: "error"
    };
  }
  //生成相应的inventory host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData, id)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }

  let hostsToProcess;
  hostsToProcess = clusterInfo.hosts || resultData.hosts;
  //检查config文件是否存在数据库中，如果存在检查集群状态是否正常，如果不正常要删除
  let configHashKey = `k8s_cluster:${id}:config`
  let masterHostName;
  let ipAddress;
  configContent = await redis.get(configHashKey);
  if (configContent) {
    const configFilePath = path.join(os.tmpdir(), `config-${id}`);
    const fileContents = fs.readFileSync(configFilePath, 'utf8');
    // 解析 YAML
    parsedData = yaml.load(fileContents);
    parsedData.clusters.forEach(cluster => {
      if (cluster.cluster && cluster.cluster.server) {
        const ipRegex = /https?:\/\/([\d.]+):\d+/;
        const match = cluster.cluster.server.match(ipRegex);

        if (match) {
          ipAddress = match[1];
          return ipAddress;
        } else {
          console.log('No IP address found in the URL.');
        }
      }
    })
    let nodeKey = `k8s_cluster:${id}:hosts:${ipAddress}`
    nodeInfo = await redis.hgetall(nodeKey);
    if (nodeInfo.ip === ipAddress) {
      masterHostName = nodeInfo.hostName
    }
    console.log(nodeInfo)
  }
  const masterResult = await getNodeStatus(id, masterHostName, hostsPath, ipAddress);
  if (masterResult.status !== "Ready") {
    await redis.del(configHashKey);
  }


  try {
    //添加master和etc 任务
    //调整是为了满足用户可以单独添加其它master任务
    for (const node of hostsToProcess) {
      //for (const node of resultData.hosts) {
      if (node.role === "master") {
        let taskName = 'initCluster'
        let taskId = `${id}_${taskName}`
        const resultPackageData = await offlinePackagesPath()
        let task = `${resultPackageData.kubesprayPath}/kubespray/cluster.yml`
        let workDir = `${resultPackageData.kubesprayPath}/kubespray`
        let configFile = `@${resultPackageData.kubesprayPath}/config.yml`
        let offlineCacheDir = `${resultPackageData.offlinePackagePath}`
        deleteTmpHostnameSync(node.hostName);
        const playbook = {
          id: id,
          taskId: taskId,
          task: task,
          clusterName: resultData.clusterName,
          taskName: taskName,
          hostName: node.hostName,
          role: node.role,
          ip: node.ip,
          hostsPath: hostsPath,
          offlineCacheDir: offlineCacheDir,
          kubeVersion: resultData.k8sVersion,
          imageArch: resultPackageData.imageArch,
          networkPlugin: resultData.networkPlugin,
          networkVersion: resultData.networkVersion,
          workDir: workDir,
          configFile: configFile,
        }
        await addTaskToQueue(id, 'initCluster', playbook, node.ip);
      }
      if (node.role === "node") {
        let taskName = `addNode`
        let taskId = `${id}_${taskName}`
        const resultPackageData = await offlinePackagesPath()
        let task = `${resultPackageData.kubesprayPath}/kubespray/scale.yml`
        let workDir = `${resultPackageData.kubesprayPath}/kubespray`
        let configFile = `@${resultPackageData.kubesprayPath}/config.yml`
        let offlineCacheDir = `${resultPackageData.offlinePackagePath}`
        deleteTmpHostnameSync(node.hostName);
        const playbook = {
          //ansible-playbook scale.yml -b -i inventory/mycluster/hosts.yaml -e kube_version=v1.30.3 --limit node2
          task: task,
          taskId: taskId,
          id: id,
          clusterName: resultData.clusterName,
          taskName: taskName,
          role: node.role,
          hostName: node.hostName,
          ip: node.ip,
          hostsPath: hostsPath,
          offlineCacheDir: offlineCacheDir,
          kubeVersion: resultData.k8sVersion,
          imageArch: resultPackageData.imageArch,
          networkPlugin: resultData.networkPlugin,
          networkVersion: resultData.networkVersion,
          workDir: workDir,
          configFile: configFile,
        }
        await addTaskToQueue(id, 'addNode', playbook);
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
    hostsPath = await getHostsYamlFile(resultData, id)
    console.log("node 的hostspath" + hostsPath)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }

  //添加node节点任务
  try {
    for (const node of clusterInfo.hosts) {
      if (node.role === "node") {
        let taskName = `addNode`
        let taskId = `${id}_${taskName}`
        const resultPackageData = await offlinePackagesPath()
        let task = `${resultPackageData.kubesprayPath}/kubespray/scale.yml`
        let workDir = `${resultPackageData.kubesprayPath}/kubespray`
        let configFile = `@${resultPackageData.kubesprayPath}/config.yml`
        let offlineCacheDir = `${resultPackageData.offlinePackagePath}`
        const playbook = {
          task: task,
          id: id,
          taskId: taskId,
          clusterName: resultData.clusterName,
          taskName: taskName,
          hostName: node.hostName,
          role: node.role,
          ip: node.ip,
          hostsPath: hostsPath,
          offlineCacheDir: offlineCacheDir,
          kubeVersion: resultData.k8sVersion,
          imageArch: resultPackageData.imageArch,
          networkPlugin: resultData.networkPlugin,
          networkVersion: resultData.networkVersion,
          workDir: workDir,
          configFile: configFile,
        }
        await addTaskToQueue(id, 'addNode', playbook);
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

  // const filteredHosts = resultData.hosts.filter(host =>
  //   host.ip === ip || host.role === 'master'
  // );

  // // 创建新的 resultData 对象
  // const curObjData = {
  //   clusterName: resultData.clusterName,
  //   offlinePackage: resultData.offlinePackage,
  //   hosts: filteredHosts
  // };

  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData, id)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
  try {
    for (const node of resultData.hosts) {
      if (node.ip == ip) {
        let taskName = `resetNode`
        let taskId = `${id}_${taskName}`
        const resultPackageData = await offlinePackagesPath()
        let task = `${resultPackageData.kubesprayPath}/kubespray/reset.yml`
        let workDir = `${resultPackageData.kubesprayPath}/kubespray`
        const playbook = {
          task: task,
          id: id,
          taskId: taskId,
          clusterName: resultData.clusterName,
          taskName: taskName,
          hostName: node.hostName,
          role: node.role,
          ip: node.ip,
          workDir: workDir,
        }
        await addTaskToQueue(id, 'resetNode', playbook);
      }
    }

  } catch (error) {
    console.error('添加删除节点任务到队列时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: '添加删除节点任务失败',
      status: "error"
    };
  }
  return {
    code: 20000,
    msg: "删除节点任务添加成功",
    status: "ok"
  };
}

//终止任务"id": "iia22a9j","jobId": "3","taskName": "resetCluster"
async function stopK8sClusterJob(parameter) {
  try {
    await stopAnsibleQueue(parameter.id, parameter.jobId, parameter.taskName)
    return {
      code: 20000,
      data: '',
      msg: "任务终止成功",
      status: "ok"
    };
  } catch (error) {
    console.error('终止任务错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
}

//重置集群任务
async function resetK8sClusterJob(id) {
  console.log("重置集群任务")
  let resultData
  let hostsPath
  try {
    resultData = await getRedis(id)
  } catch (error) {
    console.log(error)
  }
  //判断是否有移除的节点，如何节点被移除，不进行重置
  resultData.hosts = resultData.hosts.filter(node =>
    !(node.status === "Unknown")
  );
  if (resultData.hosts.length === 0) {
    return {
      code: 50000,
      msg: "没有可以重置的节点",
      status: "error"
    };
  }
  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData, id)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
  //添加重置任务
  for (const node of resultData.hosts) {
    //if (node.role === "master") {
    let taskName = 'resetCluster'
    let taskId = `${id}_${taskName}`
    const resultPackageData = await offlinePackagesPath()
    let task = `${resultPackageData.kubesprayPath}/kubespray/reset.yml`
    let workDir = `${resultPackageData.kubesprayPath}/kubespray`
    const playbook = {
      id: id,
      task: task,
      taskId: taskId,
      clusterName: resultData.clusterName,
      taskName: taskName,
      hostName: node.hostName,
      role: node.role,
      ip: node.ip,
      hostsPath: hostsPath,
      workDir: workDir,
    }
    console.log("重置集群任务添加到队列----------------", node.hostName)
    await addTaskToQueue(id, 'resetCluster', playbook);
  }
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
  function safeParse(statistics) {
    if (!statistics) {
      return {};
    }
    try {
      const formattedStatistics = statistics.replace(/'/g, '"');
      return JSON.parse(formattedStatistics);
    } catch (error) {
      console.error('Error parsing statistics:', error);
      return {};
    }
  }
  for (const item of nodeKeys) {
    const taskMatch = item.match(taskRegex);
    if (taskMatch) {
      const ip = taskMatch[1];
      const action = taskMatch[2];
      const taskId = parseInt(taskMatch[3], 10);
      //查询每个任务实例状态
      let taskInfo = await redis.hgetall(item);
      if (!result.hosts.includes(ip)) {
        result.hosts.push(ip);
      }
      if (!taskMap[ip]) {
        taskMap[ip] = {};
      }
      if (!taskMap[ip][action]) {
        taskMap[ip][action] = [];
      }

      taskMap[ip][action].push({
        task: taskId.toString(),
        processedOn: taskInfo.processedOn,
        finishedOn: taskInfo.finishedOn || Date.now(),
        status: taskInfo.status,
        statistics: safeParse(taskInfo.statistics) || {}
      });
    }
  }

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

//升级集群任务
async function upgradeK8sClusterJob(newClusterInfo, targetIP = null) {
  let resultData
  let skippedNodes = []; // 新增：用于收集被跳过的节点信息
  try {
    resultData = await getRedis(newClusterInfo.id)
  } catch (error) {
    console.error('从 Redis 获取数据时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: '获取集群信息失败'
    };
  }
  //生成相应的host.yaml文件
  try {
    hostsPath = await getHostsYamlFile(resultData, newClusterInfo.id)
  } catch (error) {
    console.error('生成hosts.yaml文件错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "生成hosts.yaml文件错误"
    };
  }

  try {
    for (const node of resultData.hosts) {
      //if (node.role === "master") {
      // 如果传入了 targetIP，则只处理与 targetIP 匹配的节点
      if (targetIP && node.ip !== targetIP) {
        continue;
      }
      // 优化后的版本解析函数（支持 v前缀 和 预发布标识）
      const parseVersion = (v) => {
        // 移除v前缀并截取预发布标识前的部分
        const cleanV = v.replace(/^v/, '').split('-')[0];
        const parts = cleanV.split('.').map(Number);
        return {
          major: parts[0] || 0,
          minor: parts[1] || 0,
          patch: parts[2] || 0
        };
      };

      const current = parseVersion(node.k8sVersion);
      const target = parseVersion(newClusterInfo.version);

      // 1. 跳过版本相同的节点
      if (current.major === target.major &&
        current.minor === target.minor &&
        current.patch === target.patch) {
        console.log(`[跳过] ${node.hostName}: 版本无变化 (${node.k8sVersion})`);
        const skipReason = `[跳过] ${node.hostName}: 版本无变化 (${node.k8sVersion})`;
        skippedNodes.push({
          hostName: node.hostName,
          ip: node.ip,
          reason: skipReason,
          currentVersion: node.k8sVersion,
          targetVersion: newClusterInfo.version
        });
        continue;
      }

      // 2. 检查主版本是否相同
      if (current.major !== target.major) {
        console.log(`[禁止] ${node.hostName}: 跨主版本升级禁止 (${current.major}.x → ${target.major}.x)`);
        const skipReason = `[禁止] ${node.hostName}: 跨主版本升级禁止 (${current.major}.x → ${target.major}.x)`;
        skippedNodes.push({
          hostName: node.hostName,
          ip: node.ip,
          reason: skipReason,
          currentVersion: node.k8sVersion,
          targetVersion: newClusterInfo.version
        });
        continue;
      }

      // 3. 检查是否为降级
      if (current.minor > target.minor ||
        (current.minor === target.minor && current.patch > target.patch)) {
        console.log(`[禁止] ${node.hostName}: 降级操作禁止 (${node.k8sVersion} → ${newClusterInfo.version})`);
        const skipReason = `[禁止] ${node.hostName}: 降级操作禁止 (${node.k8sVersion} → ${newClusterInfo.version})`;
        skippedNodes.push({
          hostName: node.hostName,
          ip: node.ip,
          reason: skipReason,
          currentVersion: node.k8sVersion,
          targetVersion: newClusterInfo.version
        });
        continue;
      }

      // 4. 检查次版本差
      if (target.minor - current.minor > 1) {
        console.log(`[禁止] ${node.hostName}: 必须按顺序升级，请先升级到 ${current.major}.${current.minor + 1}.x`);
        const skipReason = `[禁止] ${node.hostName}: 必须按顺序升级，请先升级到 ${current.major}.${current.minor + 1}.x`;
        skippedNodes.push({
          hostName: node.hostName,
          ip: node.ip,
          reason: skipReason,
          currentVersion: node.k8sVersion,
          targetVersion: newClusterInfo.version
        });
        continue;
      }

      let taskName = 'upgradeCluster'
      let taskId = `${newClusterInfo.id}_${taskName}`
      const resultPackageData = await offlinePackagesPath()
      let task = `${resultPackageData.kubesprayPath}/kubespray/upgrade-cluster.yml`
      let workDir = `${resultPackageData.kubesprayPath}/kubespray`
      let configFile = `@${resultPackageData.kubesprayPath}/config.yml`
      let offlineCacheDir = `${resultPackageData.offlinePackagePath}`
      //新的网络插件处理
      const [networkPlugin, networkVersion] = newClusterInfo.networkPlugin.split(' - ');
      //let localhostRepoPath = `${resultPackageData.offlinePackagePath}/repo_files`
      const playbook = {
        id: newClusterInfo.id,
        task: task,
        taskId: taskId,
        version: newClusterInfo.version,
        clusterName: resultData.clusterName,
        taskName: taskName,
        hostName: node.hostName,
        role: node.role,
        ip: node.ip,
        hostsPath: hostsPath,
        offlineCacheDir: offlineCacheDir,
        kubeVersion: newClusterInfo.version,
        imageArch: resultPackageData.imageArch,
        networkPlugin: networkPlugin,
        networkVersion: networkVersion,
        workDir: workDir,
        configFile: configFile,
      }
      await addTaskToQueue(newClusterInfo.id, 'upgradeCluster', playbook, newClusterInfo.version);
      //}

    }
  } catch (error) {
    return {
      code: 50000,
      msg: error.message,
      status: '添加升级任务失败'
    };
  }
  return {
    code: 20000,
    msg: '任务已成功添加到队列',
    status: "ok",
    details: skippedNodes,
  };
}

//任务活跃数展示（等待和活跃的列表）
async function getActiveTasks(id) {
  //主要展示的数据为任务名称、id
  const taskNames = [
    "initCluster",
    "addNode",
    "resetNode",
    "resetCluster",
    "upgradeCluster",
  ]
  const activeTasks = {};

  for (const taskName of taskNames) {
    const queueId = `${id}_${taskName}`;
    try {
      activeJobsData = await getActiveJobs(queueId);
    } catch (error) {
      activeJobsData = [];
    }
    const activeIPs = activeJobsData.map(job => ({ ...job, status: 'running' }));
    try {
      waitingJobsData = await getWaitingJobs(queueId);
    } catch (error) {
      waitingJobsData = [];
    }

    const waitingIPs = waitingJobsData.map(job => ({ ...job, status: 'waiting' }));

    activeTasks[taskName] = [...activeIPs, ...waitingIPs];
  }
  return {
    code: 20000,
    data: activeTasks,
    msg: "获取任务活跃实例成功",
    status: "ok"
  };
}

//终止所有的任务,参数id和taskName
async function stopK8sClusterTasks(parameter) {
  try {
    await removeAllJobs(parameter.id, parameter.taskName)
    return {
      code: 20000,
      data: '',
      msg: "所有任务终止成功",
      status: "ok"
    };
  } catch (error) {
    console.error('终止任务错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
}

//任务历史信息
async function getTaskInfo(id, ip, taskType, timestamp) {
  //从redis查询数据
  let nodeKey = `k8s_cluster:${id}:tasks:${ip}:${taskType}:${timestamp}`
  try {
    let taskInfo = await redis.hgetall(nodeKey);
    return {
      code: 20000,
      data: taskInfo.stdout,
      msg: "查询任务详情成功",
      status: "ok"
    };
  } catch (error) {
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
}

async function removeWaitingTask(parameter) {
  //先查询一下是否在等待中，如果不在直接返回错误
  try {
    await removeWaitingJobs(parameter.id, parameter.jobId, parameter.taskName)
    return {
      code: 20000,
      msg: "移除等待中的任务成功",
      status: "ok"
    };
  } catch (error) {
    return {
      code: 50000,
      msg: "移除等待中的任务失败",
      status: "error"
    };
  }
}


module.exports = {
  addK8sMasterJob,
  addK8sNodeJob,
  stopK8sClusterJob,
  resetK8sClusterJob,
  removeK8sNodeJob,
  getK8sClusterTaskList,
  upgradeK8sClusterJob,
  getActiveTasks,
  stopK8sClusterTasks,
  getTaskInfo,
  removeWaitingTask,
}

