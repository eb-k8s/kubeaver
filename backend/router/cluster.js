const KoaRouter = require('koa-router');
const router = new KoaRouter();
const serviceHost = require('../service/cluster')

// 创建集群,用户选择k8s版本，网络插件。
router.post('/k8sCluster', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.70.162:8000/api/k8sCluster -d '{"clusterName": "ubuntu","version": "v1.28.12","networkPlugin": "flannel","taskNum": 5,"hosts":[{"ip": "10.1.69.95","hostName": "eb95master","role": "master"}]}'
  const clusterInfo = ctx.request.body;
  try {
    const result = await serviceHost.createK8sCluster(clusterInfo)
    ctx.body = result
  } catch (error) {
    console.error('创建集群时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

// 获取集群列表
router.get('/k8sCluster', async (ctx) => {
  //curl -X GET -H "Content-Type: application/json" http://10.1.35.91:8000/k8sCluster
  try {
    const result = await serviceHost.getK8sCluster();
    ctx.body = result;
  } catch (error) {
    console.log('获取集群列表时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

// 更新集群信息,更新的时候id不存在，需要控制
router.put('/k8sCluster', async (ctx) => {
  //curl -X PUT -H "Content-Type: application/json"  http://10.1.35.91:8000/k8sCluster -d '{"id": "2bboadxz","clusterName": "aa","version": "1.28.2","offlinePackage": "spray-2.25.0-k8s-1.28.2_amd"}'
  //curl -X PUT -H "Content-Type: application/json"  http://10.1.35.91:8000/k8sCluster -d '{"id": "kcadleue","clusterName": "aa","version": "1.28.2","offlinePackage": "spray-2.25.0-k8s-1.28.2_amd","hosts":[{"ip": "10.1.69.232","hostName": "master1","role": "master"},{"ip": "10.1.69.235","hostName": "node2","role": "node"}]}'
  const clusterInfo = ctx.request.body;
  try {
    const result = await serviceHost.updateK8sCluster(clusterInfo);
    ctx.body = result
  } catch (error) {
    console.error('更新集群信息时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }

})
//集群未安装之前删除
router.delete('/k8sCluster', async (ctx) => {
  //curl -X DELETE "http://10.1.35.91:8000/k8sCluster?id=2ohqucd7"
  const { id } = ctx.request.query;
  try {
    const result = await serviceHost.deleteK8sCluster(id);
    ctx.body = result
  } catch (error) {
    console.error('删除集群信息时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"

    };
  }
})

//获取证书文件
router.get('/config', async (ctx) => {
  //curl -X GET -H "Content-Type: application/json" http://10.1.35.91:8000/config?id=vn24ubxe
  const id = ctx.query.id;
  try {
    const result = await serviceHost.getK8sConfigFile(id);
    ctx.body = result;
  } catch (error) {
    console.log('获取证书文件错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

module.exports = router