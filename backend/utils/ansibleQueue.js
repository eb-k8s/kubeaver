const { execSync, spawn } = require('child_process');
const Redis = require('ioredis');
const Bull = require('bull');
const path = require('path');
const fs = require('fs');
const { getRedis, getConfigFile, getNodeStatus } = require('./getNodeStatus');
const { getDatabaseByK8sVersion } = require('./getDatabase');
const { kubeadminDB } = require('./db')
// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT,
};

const redis = new Redis(redisConfig);

// 发布更新到 Redis
async function publishTaskOutput(nodeKey, output) {
  //const channel = `nodeKey`;
  await redis.publish(nodeKey, output);
}

//对任务输出做过滤处理(升级master 1970, 升级node 1218  可根据任务以及任务角色进行判断)
function filterAndProcessOutput(output, taskInfoRegex, resetRegex, taskCounts, job, redis, publishTaskOutput) {
  if (job.data.playbook.taskName === "upgradeCluster" && job.data.playbook.role === "node") {
    taskCounts = 1218;
  }
  const taskInfoMatches = [...output.matchAll(taskInfoRegex)];
  taskInfoMatches.forEach(match => {
    const taskInfo = {
      current_task: parseInt(match[1], 10),
      current_stage: match[2],
      task_stage_counts: parseInt(match[3], 10),
      current_task_time: parseFloat(match[4]),
      task_stage_time: parseFloat(match[5]),
      current_stage_task: parseInt(match[6], 10)
    };

    const taskProcessKey = `k8s_cluster:${job.data.playbook.id}:taskProgress:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
    redis.hset(taskProcessKey, {
      ...taskInfo,
      task_counts: taskCounts,
      id: job.data.playbook.id,
      node_ip: job.data.playbook.ip,
      task_name: job.data.playbook.taskName,
      timestamp_id: job.timestamp,
    }, (err) => {
      if (err) {
        console.error('Error storing task info in Redis:', err);
      }
    });

    const message = JSON.stringify({
      current_task: taskInfo.current_task,
      task_counts: taskCounts,
    });
    publishTaskOutput(taskProcessKey, message);
  });

  const resetMatches = [...output.matchAll(resetRegex)];
  let resetData;
  if (resetMatches.length > 0) {
    resetData = resetMatches[resetMatches.length - 1][0]; // 每次匹配到新的结果时覆盖旧的
  }
  //const resetData = resetMatches.map(match => match[0]).join('\n');
  const filteredOutput = output.split('\n').filter(line => {
    return !taskInfoMatches.some(match => line.includes(match[0])) &&
      !resetMatches.some(match => line.includes(match[0]));
  }).join('\n');

  return { filteredOutput, resetData };
}

const privateKeyPath = path.join(__dirname, '../ssh', 'id_rsa');
// 存储正在运行的子进程
const runningProcesses = {};

const queues = {};

async function createAnsibleQueue(baseQueueId, concurrency, k8sVersion) {
  console.log(k8sVersion)
  const dbNumber = await getDatabaseByK8sVersion(k8sVersion)
  // 深拷贝全局配置并覆盖 db
  const dynamicRedisConfig = {
    ...redisConfig, // 展开原有属性
    db: dbNumber,   // 覆盖 db
  };
  const queueConfigs = [
    { name: 'initCluster', processFunction: processInitCluster, taskNum: concurrency },
    { name: 'addNode', processFunction: processAddNode, taskNum: concurrency },
    { name: 'resetCluster', processFunction: processResetCluster, taskNum: concurrency },
    { name: 'upgradeCluster', processFunction: processUpgradeCluster, taskNum: 1 },
    { name: 'resetNode', processFunction: processResetNode, taskNum: concurrency }
  ];

  for (const config of queueConfigs) {
    const queueId = `${baseQueueId}_${config.name}`;
    const queueOld = queues[queueId];
    if (queueOld) {
      await queueOld.pause(); // 暂停队列
      await queueOld.empty(); // 清空队列
      await queueOld.close(); // 关闭队列连接
      delete queues[queueId]; // 删除旧的队列实例
    }
    const queue = new Bull(queueId, {
      redis: dynamicRedisConfig,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false,
        backoff: false,
        delay: 0,
      },
    });

    queue.process(config.name, config.taskNum, config.processFunction);
    queue.on('active', async (job) => {
      console.log(`Job ${job.id} is now active`);
      const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
      await redis.hset(nodeKey,
        'activeStatus', 'running',
        'activeJobType', job.name,
        'updateTime', Date.now()
      );
    });

    queue.on('completed', async (job) => {
      const nodeTaskKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
      //更新结束时间
      redis.hset(nodeTaskKey,
        'finishedOn', job.finishedOn,
      );
      console.log(`任务${job.data.playbook.id}的jobID${job.id} 成功完成`);
      const updateTime = Date.now();
      if (job.name == 'initCluster' && job.data.playbook.role === 'master') {
        await getConfigFile(job.data.playbook.id, job.data.playbook.hostsPath, job.data.playbook.ip)
        const result = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, job.data.playbook.ip);
        //获取证书
        const configHashKey = `k8s_cluster:${job.data.playbook.id}:config`;
        let configContent = await redis.get(configHashKey);
        //在sql数据库中创建集群信息
        const customAlphabet = (await import('nanoid/non-secure')).customAlphabet;
        const customNanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 10);
        const clusterId = customNanoid();

        const clusterAddr = `https://${job.data.playbook.ip}:6443`;
        const db = await kubeadminDB();
        await db.run(
          `INSERT INTO clusters (id, name, config, address, version, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [clusterId, job.data.playbook.clusterName, configContent, clusterAddr, job.data.playbook.kubeVersion, updateTime]
        );
        //在redis数据库中插入clusterID
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'worked',
          'k8sVersion', job.data.playbook.kubeVersion,
          'status', result.status,
          'updateTime', updateTime
        );
        await redis.hset(baseHashKey,
          'status', result.status,
          'clusterId', clusterId,//用于sql数据库
          'updateTime', updateTime
        )
        //初始化集群，没有活跃任务之后，要把taskProcess设置成Unknown
        const activeJobs = await getActiveJobs(`${job.data.playbook.taskId}`);
        if (activeJobs.length === 0) {
          await redis.hset(baseHashKey,
            'taskProcess','Unknown',
            'updateTime', updateTime
          );
        }
      }
      if (job.name == 'addNode' && job.data.playbook.role === 'node') {
        //设置节点状态
        console.log(job.data.playbook.hostName)
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        //同步查询节点健康状态
        const result = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        if (result.status) {
          await redis.hset(nodeKey,
            'status', result.status,
            'activeJobType', '',
            'activeStatus', '',
            'lastJobType', job.name,
            'lastJobStatus', 'worked',
            'k8sVersion', job.data.playbook.kubeVersion,
            'updateTime', updateTime
          )
        } else {
          console.error(`未能获取到节点状态`);
        }
        //加入节点，没有活跃任务之后，要把taskProcess设置成Unknown
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        const activeJobs = await getActiveJobs(`${job.data.playbook.taskId}`);
        if (activeJobs.length === 0) {
          await redis.hset(baseHashKey,
            'taskProcess','Unknown',
            'updateTime', updateTime
          );
        }
      }
      if (job.name == 'resetNode') {
        const result = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',//部署中状态
          'lastJobType', job.name,
          'lastJobStatus', 'worked',
          'status', result.status,//集群实际状态
          'k8sVersion', 'Unknown',
          'updateTime', updateTime
        );
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        await redis.hset(baseHashKey,
          'taskProcess','Unknown',
          'updateTime', updateTime
        )
      }
      if (job.name == 'resetCluster') {
        //如果master reset成功之后集群部署状态NotDeploy
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        if (job.data.playbook.role === 'master') {
          //重置集群成功之后要删掉config证书
          const masterResult = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, job.data.playbook.ip);
          let configHashKey = `k8s_cluster:${job.data.playbook.id}:config`
          await redis.del(configHashKey);
          //const clusterInfo = await redis.hgetall(baseHashKey);
          await redis.hset(baseHashKey,
            'status', masterResult.status,//集群实际状态
            'updateTime', updateTime
          );
        }
        const clusterAddr = `https://${job.data.playbook.ip}:6443`;
        const db = await kubeadminDB();
        await db.run('DELETE FROM clusters WHERE address = ?', clusterAddr);
        const nodeResult = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        await redis.hset(nodeKey,
          'activeStatus', '',
          'activeJobType', '',
          'lastJobType', job.name,
          'lastJobStatus', 'worked',
          'k8sVersion', 'Unknown',
          'status', nodeResult.status,//集群实际状态
          'updateTime', updateTime
        );
        //重置集群，没有活跃任务之后，要把taskProcess设置成Unknown
        const activeJobs = await getActiveJobs(`${job.data.playbook.taskId}`);
        if (activeJobs.length === 0) {
          await redis.hset(baseHashKey,
            'taskProcess','Unknown',
            'updateTime', updateTime
          );
        }
      }
      if (job.name == 'upgradeCluster') {
        //如果是master升级成功，更新集群状态和版本。节点开始升级。
        if (job.data.playbook.role === 'master') {
          await getConfigFile(job.data.playbook.id, job.data.playbook.hostsPath, job.data.playbook.ip)
          const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
          const masterStatusData = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, job.data.playbook.ip);
          const upgradeNetworkPlugin = job.data.playbook.networkPlugin + ' - ' + job.data.playbook.networkVersion;
          await redis.hset(baseHashKey,
            'clusterName', job.data.playbook.clusterName,
            'version', job.data.playbook.version,
            'networkPlugin',upgradeNetworkPlugin,
            'status', masterStatusData.status,
            'updateTime', updateTime
          );
          let resultData = await getRedis(job.data.playbook.id)
          //需要更新sql数据库中的证书文件
          const configHashKey = `k8s_cluster:${job.data.playbook.id}:config`;
          let configContent = await redis.get(configHashKey);
          const db = await kubeadminDB();
          await db.run(
            `UPDATE clusters SET config = ? WHERE id = ?`,
            [configContent, resultData.clusterId])
        }
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        const nodeStatusData = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'worked',
          'k8sVersion', job.data.playbook.kubeVersion,
          'status', nodeStatusData.status,
          'updateTime', updateTime
        );
        //升级集群，没有活跃任务之后，要把taskProcess设置成Unknown
        const activeJobs = await getActiveJobs(`${job.data.playbook.taskId}`);
        if (activeJobs.length === 0) {
          await redis.hset(baseHashKey,
            'taskProcess','Unknown',
            'updateTime', updateTime
          );
        }

      }
    });
    queue.on('failed', async (job) => {
      const nodeTaskKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
      //更新结束时间
      redis.hset(nodeTaskKey,
        'finishedOn', job.finishedOn,
      );
      redis.hget(nodeTaskKey, 'stdout', (err, existingOutput) => {
        if (err) {
          console.error('Error retrieving existing output from Redis:', err);
          return;
        }
        const newOutput = existingOutput ? existingOutput + '\nTask execution failed' : 'Task execution failed';
        redis.hset(nodeTaskKey, 'stdout', newOutput);
      });
      console.error(`任务${job.data.playbook.id}的jobID ${job.id} failed`);
      const updateTime = Date.now();
      if (job.name == 'initCluster' && job.data.playbook.role === 'master') {
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        //更新一下集群和节点健康状态
        const k8sInfo = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, job.data.playbook.ip);
        await redis.hset(baseHashKey,
          'status', k8sInfo.status,
          'taskProcess','Unknown',
          'updateTime', updateTime
        )
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'failed',
          'k8sVersion', k8sInfo.version,
          'status', k8sInfo.status,
          'updateTime', updateTime
        );
      }
      if (job.name == 'addNode' && job.data.playbook.role === 'node') {
        let nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        const k8sInfo = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'failed',
          'k8sVersion', k8sInfo.version,
          'status', k8sInfo.status,
          'updateTime', updateTime
        );
      }
      if (job.name == 'resetNode') {
        console.log("移除任务失败")
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        const k8sInfo = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'failed',
          'k8sVersion', k8sInfo.version,
          'status', k8sInfo.status,
          'updateTime', updateTime
        );
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        await redis.hset(baseHashKey,
          'taskProcess','Unknown',
          'updateTime', updateTime
        )
      }
      if (job.name == 'resetCluster') {
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        const k8sInfo = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        await redis.hset(nodeKey,
          'k8sVersion', k8sInfo.version,
          'status', k8sInfo.status,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'failed',
          'updateTime', updateTime
        );
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        const status = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, job.data.playbook.ip);
        await redis.hset(baseHashKey,
          'taskProcess','Unknown',
          'status', status,
          'updateTime', updateTime
        );
      }
      if (job.name == 'upgradeCluster') {
        const baseHashKey = `k8s_cluster:${job.data.playbook.id}:baseInfo`;
        const k8sStatus = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, job.data.playbook.ip);
        await redis.hset(baseHashKey,
          'status', k8sStatus.status,
          'taskProcess','Unknown',
          'updateTime', updateTime
        );
        //所有节点状态也要更新。
        const nodeKey = `k8s_cluster:${job.data.playbook.id}:hosts:${job.data.playbook.ip}`;
        const k8sInfo = await getNodeStatus(job.data.playbook.id, job.data.playbook.hostName, job.data.playbook.hostsPath, '');
        await redis.hset(nodeKey,
          'activeJobType', '',
          'activeStatus', '',
          'lastJobType', job.name,
          'lastJobStatus', 'failed',
          'k8sVersion', k8sInfo.version,
          'status', k8sInfo.status,
          'updateTime', updateTime
        );
      }
    });
    queues[queueId] = queue;
  }
  return queues;
}

async function processInitCluster(job) {
  console.log("-------------初始化任务--------", job.data.playbook.taskId, job.data.playbook.ip, "====" + job.id);
  console.log(job.data);
  const createTime = Date.now();
  const hostIp = process.env.HOST_IP;
  return new Promise((resolve, reject) => {
    const ansibleProcess = spawn('ansible-playbook', [
      '-i', job.data.playbook.hostsPath,
      '--private-key', `${privateKeyPath}`,
      '-M', 'plugins/modules',
      '--become',
      '--become-user=root', job.data.playbook.task,
      '--extra-vars', `kube_network_plugin=${job.data.playbook.networkPlugin}`,
      '--extra-vars', `kube_network_version=${job.data.playbook.networkVersion}`,
      '--extra-vars', `kube_version=${job.data.playbook.kubeVersion}`,
      '--extra-vars', `image_arch=${job.data.playbook.imageArch}`,
      '--extra-vars', `offline_cache_dir=${job.data.playbook.offlineCacheDir}`,
      '--extra-vars', job.data.playbook.configFile,
      '--extra-vars', `registry_host_ip=${hostIp}`,
      '--limit', job.data.playbook.hostName,
    ], {
      cwd: job.data.playbook.workDir, // 设置工作目录
      env: { ...process.env, ANSIBLE_CALLBACKS_ENABLED: 'init_task_counter_callback,profile_tasks' },
      detached: true
    });
    const processKey = `${job.id}:${job.data.playbook.taskId}`;
    runningProcesses[processKey] = ansibleProcess;
    const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
    ansibleProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const taskInfoRegex = /{'current_task': (\d+), 'current_stage': '([\w\s]+)', 'task_stage_counts': (\d+), 'current_task_time': ([\d.]+), 'task_stage_time': ([\d.]+), 'current_stage_task': (\d+)}/g;
      const resetRegex = /\[{'name': 'reset', 'time': [\d.]+},\s*{'name': 'pre_process', 'time': [\d.]+},\s*{'name': 'download', 'time': [\d.]+},\s*{'name': 'install k8s cluster', 'time': [\d.]+},\s*{'name': 'install network_plugin', 'time': [\d.]+},\s*{'name': 'after_check', 'time': [\d.]+}\]/g; //过滤的统计字段
      const { filteredOutput, resetData } = filterAndProcessOutput(output, taskInfoRegex, resetRegex, 1901, job, redis, publishTaskOutput);
      redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
        if (err) {
          console.error('Error retrieving existing output from Redis:', err);
          return reject(new Error('获取输出失败'));
        }
        //let newOutput = existingOutput ? existingOutput + output : output;
        let newOutput = existingOutput ? existingOutput + filteredOutput : filteredOutput;
        redis.hset(nodeKey,
          'jobKey', job.data.playbook.taskId,
          'jobID', job.id,
          'task', job.data.playbook.taskName,
          'ip', job.data.playbook.ip,
          'role', job.data.playbook.role,
          'k8sVersion',job.data.playbook.kubeVersion,
          'hostName', job.data.playbook.hostName,
          'stdout', newOutput,
          'processedOn', job.processedOn,
          'createTime', createTime,
          'status', 'working',
          'statistics', resetData
        );
        publishTaskOutput(nodeKey, newOutput);
      });
    });

    ansibleProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ansibleProcess.on('close', (code, signal) => {
      delete runningProcesses[processKey];
      if (signal) {
        console.log(`子进程被信号--- ${signal} 终止`);
        redis.hset(nodeKey,
          'createTime', createTime,
          'status', 'failed'
        );
        reject(new Error(`进程被信号 ${signal} 终止`));
      } else {
        console.log(`子进程退出，退出码 ${code}`);
        if (code === 0) {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'worked'
          );
          resolve();
        } else {
          console.error(`任务---- ${job.id} 失败，退出码 ${code}`);
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'failed'
          );
          reject(new Error(`进程退出，退出码 ${code}`));
        }
      }
    });
  });
}


async function processAddNode(job) {
  console.log("-------------增加节点任务--------", job.data.playbook.taskId, job.data.playbook.ip, "====" + job.id)
  console.log(job.data)
  const hostIp = process.env.HOST_IP;
  const createTime = Date.now();
  return new Promise((resolve, reject) => {
    let args = [
      '--private-key', `${privateKeyPath}`,
      '-i', `${job.data.playbook.hostsPath}`,
      '-M', 'plugins/modules',
      '--become',
      '--become-user=root', job.data.playbook.task,
      '--extra-vars', `kube_network_plugin=${job.data.playbook.networkPlugin}`,
      '--extra-vars', `kube_network_version=${job.data.playbook.networkVersion}`,
      '--extra-vars', `kube_version=${job.data.playbook.kubeVersion}`,
      '--extra-vars', `image_arch=${job.data.playbook.imageArch}`,
      '--extra-vars', `offline_cache_dir=${job.data.playbook.offlineCacheDir}`,
      '--extra-vars', job.data.playbook.configFile,
      '--extra-vars', `registry_host_ip=${hostIp}`,
      '--limit', job.data.playbook.hostName
    ]
    console.log("node参数配置" + args)
    const ansibleProcess = spawn('ansible-playbook', args, {
      cwd: job.data.playbook.workDir, // 设置工作目录
      env: { ...process.env, ANSIBLE_CALLBACKS_ENABLED: 'add_task_counter_callback,profile_tasks' },
      detached: true, //创建一个新的进程
    });
    const processKey = `${job.id}:${job.data.playbook.taskId}`;
    runningProcesses[processKey] = ansibleProcess;
    // 处理标准输出
    const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
    ansibleProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const taskInfoRegex = /{'current_task': (\d+), 'current_stage': '([\w\s]+)', 'task_stage_counts': (\d+), 'current_task_time': ([\d.]+), 'task_stage_time': ([\d.]+), 'current_stage_task': (\d+)}/g;
      const resetRegex = /\[{'name': 'reset', 'time': [\d.]+},\s*{'name': 'pre_process', 'time': [\d.]+},\s*{'name': 'download', 'time': [\d.]+},\s*{'name': 'add to cluster', 'time': [\d.]+},\s*{'name': 'install network_plugin', 'time': [\d.]+},\s*{'name': 'after_check', 'time': [\d.]+}\]/g; //过滤的统计字段
      const { filteredOutput, resetData } = filterAndProcessOutput(output, taskInfoRegex, resetRegex, 1287, job, redis, publishTaskOutput);

      redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
        if (err) {
          console.error('Error retrieving existing output from Redis:', err);
          return;
        }
        let newOutput = existingOutput ? existingOutput + filteredOutput : filteredOutput;
        redis.hset(nodeKey, 'jobKey', job.data.playbook.taskId, 'jobID', job.id, 'processedOn', job.processedOn, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role, 'hostName', job.data.playbook.hostName, 'k8sVersion',job.data.playbook.kubeVersion,'stdout', newOutput, 'status', 'working', 'createTime', createTime, 'statistics', resetData);
        // 发布更新到 Redis
        publishTaskOutput(nodeKey, newOutput);
      });
    });

    ansibleProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    ansibleProcess.on('close', (code, signal) => {
      delete runningProcesses[processKey];
      if (signal) {
        redis.hset(nodeKey,
          'createTime', createTime,
          'status', 'failed'   //任务状态
        );
        console.log(`子进程被信号 ${signal} 终止`);
        reject(new Error(`进程被信号 ${signal} 终止`));
      } else {
        console.log(`子进程退出，退出码 ${code}`);
        if (code === 0) {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'worked'
          );
          resolve();
        } else {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'failed'
          );
          console.error(`任务 ${job.id} 失败，退出码 ${code}`);
          reject(new Error(`进程退出，退出码 ${code}`));
        }
      }
    });
  });
}

async function processUpgradeCluster(job) {
  console.log("-------------集群升级任务--------", job.data.playbook.taskId, job.data.playbook.ip, "====" + job.id)
  console.log(job.data)
  const createTime = Date.now();
  return new Promise((resolve, reject) => {
    const ansibleProcess = spawn('ansible-playbook', [
      '--private-key', `${privateKeyPath}`,
      '-i', `${job.data.playbook.hostsPath}`,
      '-M', 'plugins/modules',
      '--become',
      '--become-user=root', job.data.playbook.task,
      '--extra-vars', `kube_network_plugin=${job.data.playbook.networkPlugin}`,
      '--extra-vars', `kube_network_version=${job.data.playbook.networkVersion}`,
      '--extra-vars', `kube_version=${job.data.playbook.kubeVersion}`,
      '--extra-vars', `image_arch=${job.data.playbook.imageArch}`,
      '--extra-vars', `offline_cache_dir=${job.data.playbook.offlineCacheDir}`,
      '--extra-vars', job.data.playbook.configFile,
      '--limit', job.data.playbook.hostName,
    ], {
      cwd: job.data.playbook.workDir,
      env: { ...process.env, ANSIBLE_CALLBACKS_ENABLED: 'upgrade_task_counter_callback,profile_tasks' },
      detached: true
    });
    const processKey = `${job.id}:${job.data.playbook.taskId}`;
    runningProcesses[processKey] = ansibleProcess;
    const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
    ansibleProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const taskInfoRegex = /{'current_task': (\d+), 'current_stage': '([\w\s]+)', 'task_stage_counts': (\d+), 'current_task_time': ([\d.]+), 'task_stage_time': ([\d.]+), 'current_stage_task': (\d+)}/g;
      const resetRegex = /\[{'name': 'pre_process', 'time': [\d.]+},\s*{'name': 'upgrade master components', 'time': [\d.]+},\s*{'name': 'upgrade network_plugin', 'time': [\d.]+},\s*{'name': 'upgrade node components', 'time': [\d.]+},\s*{'name': 'after_check', 'time': [\d.]+}\]/g; //过滤的统计字段
      const { filteredOutput, resetData } = filterAndProcessOutput(output, taskInfoRegex, resetRegex, 1970, job, redis, publishTaskOutput);
      redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
        if (err) {
          console.error('Error retrieving existing output from Redis:', err);
          return;
        }
        let newOutput = existingOutput ? existingOutput + filteredOutput : filteredOutput;
        redis.hset(nodeKey, 'jobKey', job.data.playbook.taskId, 'jobID', job.id, 'processedOn', job.processedOn, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role, 'k8sVersion',job.data.playbook.kubeVersion,'stdout', newOutput, 'status', 'working', 'createTime', createTime, 'statistics', resetData);
        publishTaskOutput(nodeKey, newOutput);
      });
    });

    ansibleProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ansibleProcess.on('close', (code, signal) => {
      delete runningProcesses[processKey];
      if (signal) {
        console.log(`子进程被信号 ${signal} 终止`);
        redis.hset(nodeKey,
          'createTime', createTime,
          'status', 'failed'
        );
        reject(new Error(`进程被信号 ${signal} 终止`));
      } else {
        console.log(`子进程退出，退出码 ${code}`);
        if (code === 0) {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'worked'
          );
          resolve();
        } else {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'failed'
          );
          console.error(`任务 ${job.id} 失败，退出码 ${code}`);
          reject(new Error(`进程退出，退出码 ${code}`));
        }
      }
    });
  });
}

async function processResetNode(job) {
  console.log("----------移除node任务--------", job.data.playbook.taskId, job.data.playbook.ip, "====" + job.id)
  console.log(job.data)
  const createTime = Date.now();
  return new Promise((resolve, reject) => {
    let args = [
      '--private-key', `${privateKeyPath}`,
      '-i', `${hostsPath}`,
      '--become',
      '--become-user=root', job.data.playbook.task,
      '-e', `node=${job.data.playbook.hostName}`,
      '-e', 'reset_cluster=false',
    ]
    let workDir = job.data.playbook.workDir
    const ansibleProcess = spawn('ansible-playbook', args, {
      cwd: workDir, // 设置工作目录
      env: { ...process.env, ANSIBLE_CALLBACKS_ENABLED: 'reset_task_counter_callback,profile_tasks' },
      detached: true
    });
    const processKey = `${job.id}:${job.data.playbook.taskId}`;
    runningProcesses[processKey] = ansibleProcess;
    // 处理标准输出
    const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
    ansibleProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const taskInfoRegex = /{'current_task': (\d+), 'current_stage': '(\w+)', 'task_stage_counts': (\d+), 'current_task_time': ([\d.]+), 'task_stage_time': ([\d.]+), 'current_stage_task': (\d+)}/g;
      const resetRegex = /\[{'name': 'reset', 'time': [\d.]+}\]/g;
      const { filteredOutput, resetData } = filterAndProcessOutput(output, taskInfoRegex, resetRegex, 31, job, redis, publishTaskOutput);
      redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
        if (err) {
          console.error('Error retrieving existing output from Redis:', err);
          return;
        }
        let newOutput = existingOutput ? existingOutput + filteredOutput : filteredOutput;
        redis.hset(nodeKey, 'jobKey', job.data.playbook.taskId, 'jobID', job.id, 'processedOn', job.processedOn, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role, 'k8sVersion',job.data.playbook.kubeVersion,'stdout', newOutput, 'status', 'working', 'createTime', createTime, 'statistics', resetData);
        // 发布更新到 Redis
        publishTaskOutput(nodeKey, newOutput);
      });
    });

    ansibleProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    ansibleProcess.on('close', (code, signal) => {
      delete runningProcesses[processKey];
      if (signal) {
        redis.hset(nodeKey,
          'createTime', createTime,
          'status', 'failed'
        );
        console.log(`子进程被信号 ${signal} 终止`);
        reject(new Error(`进程被信号 ${signal} 终止`));
      } else {
        console.log(`子进程退出，退出码 ${code}`);
        if (code === 0) {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'worked'
          );
          resolve();
        } else {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'failed'
          );
          console.error(`任务 ${job.id} 失败，退出码 ${code}`);
          reject(new Error(`进程退出，退出码 ${code}`));
        }
      }
    });
  });
}

async function processResetCluster(job) {
  console.log("-------------重置集群任务--------", job.data.playbook.taskId, job.data.playbook.ip, "====" + job.id)
  console.log(job.data)
  const createTime = Date.now();
  return new Promise((resolve, reject) => {
    const ansibleProcess = spawn('ansible-playbook', [
      '--private-key', `${privateKeyPath}`,
      '-i', `${job.data.playbook.hostsPath}`,
      '--become',
      '--become-user=root', job.data.playbook.task,
      '-e', `node=${job.data.playbook.hostName}`,
      // '--limit', job.data.playbook.hostName,
      '-e', 'reset_cluster=true',
    ], {
      cwd: job.data.playbook.workDir,
      env: { ...process.env, ANSIBLE_CALLBACKS_ENABLED: 'reset_task_counter_callback,profile_tasks' },
      detached: true
    });
    const processKey = `${job.id}:${job.data.playbook.taskId}`;
    runningProcesses[processKey] = ansibleProcess;
    const nodeKey = `k8s_cluster:${job.data.playbook.id}:tasks:${job.data.playbook.ip}:${job.data.playbook.taskName}:${job.timestamp}`;
    ansibleProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const taskInfoRegex = /{'current_task': (\d+), 'current_stage': '(\w+)', 'task_stage_counts': (\d+), 'current_task_time': ([\d.]+), 'task_stage_time': ([\d.]+), 'current_stage_task': (\d+)}/g;
      const resetRegex = /\[{'name': 'reset', 'time': [\d.]+}\]/g;
      const { filteredOutput, resetData } = filterAndProcessOutput(output, taskInfoRegex, resetRegex, 65, job, redis, publishTaskOutput);
      redis.hget(nodeKey, 'stdout', (err, existingOutput) => {
        if (err) {
          console.error('Error retrieving existing output from Redis:', err);
          return;
        }
        let newOutput = existingOutput ? existingOutput + filteredOutput : filteredOutput;
        redis.hset(nodeKey, 'jobKey', job.data.playbook.taskId, 'jobID', job.id, 'processedOn', job.processedOn, 'task', job.data.playbook.taskName, 'ip', job.data.playbook.ip, 'role', job.data.playbook.role,'k8sVersion',job.data.playbook.kubeVersion, 'stdout', newOutput, 'status', 'working', 'createTime', createTime, 'statistics', resetData);
        publishTaskOutput(nodeKey, newOutput);
      });
    });

    ansibleProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ansibleProcess.on('close', (code, signal) => {
      delete runningProcesses[processKey];
      if (signal) {
        console.log(`子进程被信号 ${signal} 终止`);
        redis.hset(nodeKey,
          'createTime', createTime,
          'status', 'failed'
        );
        reject(new Error(`进程被信号 ${signal} 终止`));
      } else {
        console.log(`子进程退出，退出码 ${code}`);
        if (code === 0) {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'worked'
          );
          resolve();
        } else {
          redis.hset(nodeKey,
            'createTime', createTime,
            'status', 'failed'
          );
          console.error(`任务 ${job.id} 失败，退出码 ${code}`);
          reject(new Error(`进程退出，退出码 ${code}`));
        }
      }
    });
  });
}

async function addTaskToQueue(id, taskName, playbook, oldK8sVersion, k8sVersion) {
  const queueId = `${id}_${taskName}`;
  if (!queues[queueId]) {
    console.log(`QueueID ${queueId} 不存在,无法创建队列`);
    throw new Error(`QueueID ${queueId} 不存在.`);
  }
  //updateQueueConcurrency(queueId, taskNum)
  //console.log(queues[queueId])
  await queues[queueId].add(taskName, { playbook });
  await redis.select(0);
  //更新redi数据中节点信息的当前执行的是什么任务
  await updateNodeStatus(id, playbook.ip, taskName)
  //更新集群部署状态
  await updateClusterStatus(id,taskName)
}

async function updateNodeStatus(id, ip, taskName) {
  const nodeKey = `k8s_cluster:${id}:hosts:${ip}`;
  // 获取活跃中的任务
  const activeJobs = await getActiveJobs(`${id}_${taskName}`);
  const isActive = activeJobs.some(job => job.ip === ip);

  // 获取等待中的任务
  const waitingJobs = await getWaitingJobs(`${id}_${taskName}`);
  const isWaiting = waitingJobs.some(job => job.ip === ip);

  // 根据任务名称和状态设置部署状态
  let activeStatus;
  if (isActive) {
    activeStatus = 'running';
  } else if (isWaiting) {
    activeStatus = 'waiting';
  } else {
    activeStatus = ''; // 默认状态
  }
  // 设置 activeJob 为当前任务名称
  const activeJobType = taskName;
  await redis.hset(nodeKey,
    'activeStatus', activeStatus,
    'activeJobType', activeJobType,
    'updateTime', Date.now()
  );
}

async function updateClusterStatus(id, taskName) {
  const clusterKey = `k8s_cluster:${id}:baseInfo`;
  let statusValue;

  // 根据taskName确定要更新的状态值
  switch (taskName) {
    case 'initCluster':
    case 'addNode':
      statusValue = 'deploying';
      break;
    case 'resetCluster':
      case 'resetNode':
      statusValue = 'resetting';
      break;
    case 'upgradeCluster':
      statusValue = 'upgrading';
      break;
    default:
      statusValue = 'unknown';
  }
  try {
    // 更新哈希中的taskProcess字段
    await redis.select(0);
    await redis.hset(clusterKey, 'taskProcess', statusValue);
  } catch (error) {
    console.error(`Error updating cluster status for ${clusterKey}:`, error);
    throw error;
  }
}

//获取等待中的job
async function getWaitingJobs(queueId) {
  if (!queues[queueId]) {
    throw new Error(`QueueID ${queueId} 不存在.`);
  }
  try {
    const waitingJobs = await queues[queueId].getWaiting();
    //console.log(waitingJobs)
    return waitingJobs.map(job => ({
      jobId: job.id,
      taskName: job.data.playbook.taskName,
      taskId: job.data.playbook.taskId,
      ip: job.data.playbook.ip,
      role: job.data.playbook.role,
      k8sVersion:job.data.playbook.kubeVersion,
      hostName: job.data.playbook.hostName,
      timestamp: job.timestamp,
    }));
  } catch (error) {
    console.error(`Error retrieving waiting tasks for queue ${queueId}:`, error);
    throw error;
  }
}

//获取活跃中的job
async function getActiveJobs(queueId) {
  if (!queues[queueId]) {
    throw new Error(`QueueID ${queueId} 不存在.`);
  }
  try {
    const activeJobs = await queues[queueId].getActive();
    return activeJobs.map(job => ({
      jobId: job.id,
      taskName: job.data.playbook.taskName,
      taskId: job.data.playbook.taskId,
      ip: job.data.playbook.ip,
      k8sVersion:job.data.playbook.kubeVersion,
      role: job.data.playbook.role,
      hostName: job.data.playbook.hostName,
      timestamp: job.timestamp,
    }));
  } catch (error) {
    console.error(`获取队列 ${queueId} 中正在运行的任务时出错:`, error);
    throw error;
  }
}
//移除活跃中的任务和等待中的任务
async function removeAllJobs(id, taskName) {
  // 终止所有该类型的任务
  let queueId = `${id}_${taskName}`;
  try {
    // 获取活跃的任务，终止
    const activeJobs = await getActiveJobs(queueId);
    for (const job of activeJobs) {
      const processKey = `${job.jobId}:${job.taskId}`;
      const processToKill = runningProcesses[processKey];
      if (processToKill) {
        process.kill(-processToKill.pid, 'SIGKILL');
        //processToKill.kill('SIGKILL'); // 发送终止信号
        delete runningProcesses[processKey];
        console.log(`运行中的任务 ${job.jobId} 的进程已终止`);
      }
    }
    // 获取等待中的任务，移除
    const waitingJobs = await getWaitingJobs(queueId);
    for (const job of waitingJobs) {
      const jobToRemove = await queues[queueId].getJob(job.jobId);
      if (jobToRemove) {
        await jobToRemove.remove();
        console.log(`任务 ${job.jobId} 已从队列 ${queueId} 中移除`);
      }
      const nodeKey = `k8s_cluster:${id}:hosts:${jobToRemove.data.playbook.ip}`;
      await redis.hset(nodeKey,
        'activeStatus', '',
        'activeJobType', '',
        'k8sVersion', 'Unknown',
        'updateTime', Date.now()
      );
    }
  } catch (error) {
    console.error(`从队列 ${queueId} 中移除任务时出错:`, error);
    throw error;
  }
}
//终止单个任务
async function stopAnsibleQueue(id, jobId, taskName) {
  let queueId = `${id}_${taskName}`;
  if (!queues[queueId]) {
    throw new Error(`QueueID ${queueId} 不存在.`);
  }
  const activeJobs = await getActiveJobs(queueId);
  const jobExists = activeJobs.some(job => job.jobId === jobId);
  if (jobExists) {
    const processKey = `${jobId}:${queueId}`;
    const processToKill = runningProcesses[processKey];
    if (processToKill) {
      //processToKill.kill('SIGKILL'); // 发送终止信号
      process.kill(-processToKill.pid, 'SIGKILL'); // 发送终止信号给整个进程组
      delete runningProcesses[processKey];
      console.log(`运行中的任务 ${jobId} 的进程正在终止`);
    }
  } else {
    console.log(`任务 ${jobId} 不存在于队列 ${queueId} 中`);
    return {
      code: 50000,
      msg: `移除失败，该任务 ${jobId} 不存在`,
      status: "error"
    };
  }
}

//单独移除某个等待中的任务
async function removeWaitingJobs(id, jobId, taskName) {
  const queueId = `${id}_${taskName}`;
  try {
    const waitingJobs = await getWaitingJobs(queueId);
    const jobExists = waitingJobs.some(job => job.jobId === jobId);
    if (jobExists) {
      const jobToRemove = await queues[queueId].getJob(jobId);
      if (jobToRemove) {
        await jobToRemove.remove();
        console.log(`任务 ${jobId} 已从队列 ${queueId} 中移除`);
      }
      const nodeKey = `k8s_cluster:${id}:hosts:${jobToRemove.data.playbook.ip}`;
      await redis.hset(nodeKey,
        'activeStatus', '',
        'activeJobType', '',
        'k8sVersion', 'Unknown',
        'updateTime', Date.now()
      );
    } else {
      console.log(`任务 ${jobId} 不存在于队列 ${queueId} 中`);
      return {
        code: 50000,
        msg: `移除失败，该任务 ${jobId} 不存在`,
        status: "error"
      };
    }
  } catch (error) {
    console.error(`从队列 ${queueId} 中移除任务时出错:`, error);
    return {
      code: 50000,
      msg: `移除等待中的任务出错`,
      status: "error"
    };
  }
}

module.exports = {
  createAnsibleQueue,
  addTaskToQueue,
  stopAnsibleQueue,
  getWaitingJobs,
  getActiveJobs,
  updateNodeStatus,
  removeAllJobs,
  removeWaitingJobs,
  queues,
};
