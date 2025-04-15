const KoaRouter = require('koa-router');
const router = new KoaRouter();
const Joi = require('joi');
const serviceHost = require('../service/cluster')

const clusterSchema = Joi.object({
  clusterName: Joi.string().required(),
  version: Joi.string().required(),
  networkPlugin: Joi.string().required(),
  taskNum: Joi.number().integer().min(1).required(),
  hosts: Joi.array().items(
    Joi.object({
      ip: Joi.string().ip().required(),
      hostName: Joi.string().required(),
      user: Joi.string().required(),
      os: Joi.string().required(),
      role: Joi.string().valid('master', 'node').required()
    }),
  ).min(1).required(),
});

const updateClusterSchema = Joi.object({
  id: Joi.string().required(),
  clusterName: Joi.string().optional(),
  version: Joi.string().optional(),
  networkPlugin: Joi.string().required(),
  taskNum: Joi.number().integer().min(1).required(),
  hosts: Joi.array().items(
    Joi.object({
      ip: Joi.string().ip().required(),
      hostName: Joi.string().required(),
      role: Joi.string().valid('master', 'node').required(),
      user: Joi.string().required(),
      os: Joi.string().required(),
      k8sVersion: Joi.string().optional(),
      status: Joi.string().optional(),
      lastJobType: Joi.string().optional(),
      lastJobStatus: Joi.string().optional(),
      createTime: Joi.string().optional(),
      updateTime: Joi.string().optional(),
    })
  ).optional()
});

// 创建集群,用户选择k8s版本，网络插件。
router.post('/k8sCluster', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.70.162:8000/api/k8sCluster -d '{"clusterName": "ubuntu","version": "v1.28.12","networkPlugin": "flannel","taskNum": 5,"hosts":[{"ip": "10.1.69.95","hostName": "eb95master","user":"root","os":"centos 7","role": "master"}]}'
  const clusterInfo = ctx.request.body;
  const { error } = clusterSchema.validate(clusterInfo);
  if (error) {
    ctx.body = {
      code: 40000,
      data: "",
      msg: `Validation error: ${error.details[0].message}`,
      status: "error"
    };
    return;
  }
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
  //curl -X PUT -H "Content-Type: application/json"  http://10.1.35.91:8000/k8sCluster -d '{"id": "kcadleue","clusterName": "aa","networkPlugin":"calico","taskNum":"2","version": "1.28.2","hosts":[{"ip": "10.1.69.232","hostName": "master1","user":"root","os":"centos 7","role": "master","status":'',"lastJobType":'failed',"lastJobStatus":'initCluster'}]}'
  const clusterInfo = ctx.request.body;
  const { error } = updateClusterSchema.validate(clusterInfo);
  if (error) {
    ctx.body = {
      code: 40000,
      data: "",
      msg: error.details[0].message,
      status: "error"
    };
    return;
  }
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