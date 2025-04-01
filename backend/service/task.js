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

//redis一直处于连接
const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

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
  // if (Array.isArray(clusterInfo.hosts)) {
  //   hostsToProcess = clusterInfo.hosts;
  // } else {
  //   hostsToProcess = resultData.hosts;
  // }
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
  console.log(masterResult.status)
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
        let task = `${resultPackageData.kubesprayPath}/reset.yml`
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
    let task = `${resultPackageData.kubesprayPath}/reset.yml`
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
  try {
    resultData = await getRedis(newClusterInfo.id)
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
    hostsPath = await getHostsYamlFile(resultData, newClusterInfo.id)
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
      //if (node.role === "master") {
      // 如果传入了 targetIP，则只处理与 targetIP 匹配的节点
      if (targetIP && node.ip !== targetIP) {
        continue;
      }
      let taskName = 'upgradeCluster'
      let taskId = `${newClusterInfo.id}_${taskName}`
      const resultPackageData = await offlinePackagesPath()
      let task = `${resultPackageData.kubesprayPath}/kubespray/upgrade-cluster.yml`
      let workDir = `${resultPackageData.kubesprayPath}/kubespray`
      let configFile = `@${resultPackageData.kubesprayPath}/config.yml`
      let offlineCacheDir = `${resultPackageData.offlinePackagePath}`
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
        networkPlugin: resultData.networkPlugin,
        workDir: workDir,
        configFile: configFile,
      }
      await addTaskToQueue(newClusterInfo.id, 'upgradeCluster', playbook);
      //}

    }
  } catch (error) {
    return {
      code: 50000,
      msg: '添加升级任务失败',
      status: "error"
    };
  }
  return {
    code: 20000,
    msg: '任务已成功添加到队列',
    status: "ok"
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
    /*
    let taskInfoData = taskInfo.stdout;
    //rest 开始
    if (taskInfoData.includes("PLAY [force delete node]")) {
      taskInfoData = taskInfoData.replace("PLAY [force delete node]", "Start Stage: reset————\nPLAY [force delete node]");
    }
 
    // pre开始
    if (taskInfoData.includes("PLAY [prepare for using kubespray playbook]")) {
      taskInfoData = taskInfoData.replace("PLAY [prepare for using kubespray playbook]", "Start Stage: pre_playbook————\nPLAY [prepare for using kubespray playbook]");
    }
    //预检查开始
    if (taskInfoData.includes("PLAY [Prepare for etcd install]")) {
      taskInfoData = taskInfoData.replace("PLAY [Prepare for etcd install]", "Start Stage: pre_check————\nPLAY [Prepare for etcd install]");
    }
    //download阶段开始
    const downloadTask = "TASK [download : Prep_download | On localhost, check if passwordless root is possible]";
    if (taskInfoData.includes(downloadTask)) {
      const regex = new RegExp(`(TASK \\[download : Prep_download \\| Set a few facts\\] \\*{30,})`);
      taskInfoData = taskInfoData.replace(regex, "Start Stage: download————\n$1");
    }
    //安装k8s集群阶段开始
    if (taskInfoData.includes("PLAY [Install etcd]")) {
      taskInfoData = taskInfoData.replace("PLAY [Install etcd]", "Start Stage: install k8s cluster————\nPLAY [Install etcd]");
    }
    //开始安装网络插件
    if (taskInfoData.includes("PLAY [Invoke kubeadm and install a CNI]")) {
      taskInfoData = taskInfoData.replace("PLAY [Invoke kubeadm and install a CNI]", "Start Stage: install network_plugin————\nPLAY [Invoke kubeadm and install a CNI]");
    }
    //检查
    if (taskInfoData.includes("PLAY [Patch Kubernetes for Windows]")) {
      taskInfoData = taskInfoData.replace("PLAY [Patch Kubernetes for Windows]", "Start Stage: after_check————\nPLAY [Patch Kubernetes for Windows]");
    }
    */
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

