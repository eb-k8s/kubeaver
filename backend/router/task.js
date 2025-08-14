const KoaRouter = require('koa-router');
const router = new KoaRouter();
const serviceHost = require('../service/task')


router.post('/k8sClusterMasterJob', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.70.162:8000/api/k8sClusterMasterJob -d '{"id": "p1smtk0h","hosts":[{"ip": "10.1.69.236","hostName": "eb236master","role": "master"}]}'
  //curl -X POST -H "Content-Type: application/json" http://10.1.70.162:8000/api/k8sClusterMasterJob -d '{"id": "p1smtk0h","hosts":[{"ip": "10.1.69.236"]}'
  const clusterInfo = ctx.request.body;
  try {
    const result = await serviceHost.addK8sMasterJob(clusterInfo);
    ctx.body = result;
  } catch (error) {
    console.error('添加任务时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
});

//添加node节点任务
router.post('/k8sClusterNodeJob', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.70.162:8000/api/k8sClusterNodeJob -d '{"id": "n9l3a9c8","hosts":[{"ip": "10.1.69.238","hostName": "node2","role": "node"}]}'
  const clusterInfo = ctx.request.body;
  try {
    const result = await serviceHost.addK8sNodeJob(clusterInfo);
    ctx.body = result;
  } catch (error) {
    console.error('添加节点时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
});

//终止单个任务
router.post('/stopJob', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.35.91:8000/stopJob -d '{"id": "iia22a9j","jobId": "3","taskName": "resetCluster"}'
  const parameter = ctx.request.body;
  if (!parameter.id || !parameter.jobId || !parameter.taskName) {
    ctx.body = {
      code: 40000,
      msg: 'Missing required parameters: id, jobId, and taskName are required.',
      status: 'error'
    };
    return;
  }
  try {
    const result = await serviceHost.stopK8sClusterJob(parameter)
    ctx.body = result;
  } catch (error) {
    console.error('取消任务时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
})

//将node节点移出集群或者将master移除集群
router.delete('/k8sClusterNodeJob', async (ctx) => {
  //curl -X DELETE "http://10.1.35.91:8000/k8sClusterNodeJob?id=vn24ubxe&nodeIP=10.1.69.232"
  const { id, nodeIP } = ctx.request.query;
  try {
    const result = await serviceHost.removeK8sNodeJob(id, nodeIP);
    ctx.body = result;
  } catch (error) {
    console.error('删除节点时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

//获取任务实例
router.get('/k8sClusterTask', async (ctx) => {
  //获取挪个集群的任务实例
  //curl -X GET -H "Content-Type: application/json" http://10.1.35.91:8000/k8sClusterTask?id=vn24ubxe
  const id = ctx.request.query.id;
  try {
    const result = await serviceHost.getK8sClusterTaskList(id);
    ctx.body = result;
  } catch (error) {
    console.error('获取集群列表时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

//重置集群
router.delete('/resetK8sClusterJob', async (ctx) => {
  //curl -X DELETE "http://10.1.35.91:8000/resetK8sClusterJob?id=w72zopr3"
  try {
    const { id } = ctx.request.query;
    const result = await serviceHost.resetK8sClusterJob(id);
    ctx.body = result;
  } catch (error) {
    console.error('添加重置集群任务时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

// //集群升级
// router.put('/upgradeK8sClusterJob', async (ctx) => {
//   //curl -X PUT -H "Content-Type: application/json" http://10.1.70.162:8000/api/upgradeK8sClusterJob -d '{"id": "p1smtk0h","clusterName": "test","version": "v1.29.7"}'
//   const newClusterInfo = ctx.request.body;
//   try {
//     const result = await serviceHost.upgradeK8sClusterJob(newClusterInfo);
//     ctx.body = result;
//   } catch (error) {
//     console.error('添加升级任务时发生错误:', error.message || error);
//     ctx.body = {
//       code: 50000,
//       data: "",
//       msg: error.message,
//       status: "error"
//     };
//   }

// })
//集群升级
router.put('/upgradeK8sClusterJob', async (ctx) => {
  //curl -X PUT -H "Content-Type: application/json" http://10.1.70.162:8000/api/upgradeK8sClusterJob -d '{"id": "p1smtk0h","clusterName": "test","version": "v1.29.7","networkPlugin":"","ip": "10.1.69.236"}'
  const newClusterInfo = ctx.request.body;
  const targetIP = newClusterInfo.ip || null; // 获取 IP 参数，如果没有则为 null

  try {
    const result = await serviceHost.upgradeK8sClusterJob(newClusterInfo, targetIP);
    ctx.body = result;
  } catch (error) {
    console.error('添加升级任务时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
});

/*
//获取当前活跃任务接口（active,waiting)
router.get('/activeTasks', async (ctx) => {
  //curl -X GET -H "Content-Type: application/json" http://10.1.35.91:8000/activeTasks?id=vn24ubxe
  const id = ctx.request.query.id;
  try {
    const result = await serviceHost.getActiveTasks(id);
    ctx.body = result;
  } catch (error) {
    console.error('获取当前任务活跃数发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})
*/
//终止所有任务
router.post('/stopJobs', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.35.91:8000/stopJobs -d '{"id": "xihio9om","taskName": "resetCluster"}'
  const parameter = ctx.request.body;
  try {
    const result = await serviceHost.stopK8sClusterTasks(parameter)
    ctx.body = result;
  } catch (error) {
    console.error('终止任务时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
})

//任务详情
router.get('/taskInfo', async (ctx) => {
  //curl -X GET -H "Content-Type: application/json" http://10.1.35.91:8000/taskInfo?id=2ohqucd7&ip=10.1.69.235&taskType=addNode&timestamp=1726220550129 
  const { id, ip, taskType, timestamp } = ctx.query;
  try {
    const result = await serviceHost.getTaskInfo(id, ip, taskType, timestamp);
    ctx.body = result;
  } catch (error) {
    console.error('获取当前任务信息发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})
//移除等待中的任务
router.post('/removeWaitingTask', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.35.91:8000/removeWaitingTask -d '{"id": "iia22a9j","jobId": "3","taskName": "resetCluster",}'
  const parameter = ctx.request.body;
  try {
    const result = await serviceHost.removeWaitingTask(parameter)
    ctx.body = result;
  } catch (error) {
    console.error('移除等待中任务时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
})

module.exports = router