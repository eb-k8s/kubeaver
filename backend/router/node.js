const KoaRouter = require('koa-router');
const router = new KoaRouter();
const serviceHost = require('../service/node')

//获取集群节点列表
router.get('/k8sClusterNodes', async (ctx, next) => {
  const id = ctx.query.id;
  try {
    const data = await serviceHost.getNodeList(id);
    ctx.body = data;
  } catch (error) {
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})

//添加集群节点
router.post('/k8sClusterNode', async (ctx) => {
  //默认etcd与master在同一个节点，目前只支持一个master
  //curl -X POST -H "Content-Type: application/json" http://10.1.35.91:8000/k8sClusterNode -d '{"id": "vn24ubxe","hosts":[{"ip": "10.1.69.235","hostName": "master1","role": "master","status": ""}]}'
  const clusterInfo = ctx.request.body;
  try {
    const result = await serviceHost.addK8sClusterNode(clusterInfo)
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

//节点删除
router.delete('/k8sClusterNode', async (ctx) => {
  //curl -X DELETE "http://10.1.35.91:8000/k8sClusterNode?id=2ohqucd7&nodeIP=10.1.69.235"
  const { id, nodeIP } = ctx.request.query;
  if (!id || !nodeIP) {
    ctx.body = {
      code: 80000,
      msg: '缺少ID和nodeIP',
      status: 'error'
    };
    return;
  }
  const parameter = {
    id,
    nodeIP,
  };

  try {
    const result = await serviceHost.deleteK8sClusterNode(parameter)
    ctx.body = result;
  } catch (error) {
    console.error('删除集群节点信息时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
});

module.exports = router