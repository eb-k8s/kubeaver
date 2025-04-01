const KoaRouter = require('koa-router');
const router = new KoaRouter();
const Redis = require('ioredis');
const serviceHost = require('../service/common')
const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});
//用于返回kubespray和k8s版本所有信息
router.get('/versions', async (ctx) => {
  try {
    const keys = await redis.keys('kubeaver_version_*');
    const versions = [];
    for (const key of keys) {
      const dataString = await redis.get(key);
      if (dataString) {
        const data = JSON.parse(dataString);
        versions.push(data);
      }
    }
    return ctx.body = {
      code: 20000,
      data: versions,
      status: "ok"
    };
  } catch (error) {
    console.error('获取版本信息失败:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
});

//添加镜像仓库地址
router.post('/imagesAddr', async (ctx) => {
  //curl -X POST -H "Content-Type: application/json" http://10.1.70.162:8000/api/imagesAddr -d '{"clusterId":"oic96p96","imageAddr": "http://store.e-byte.cn","registryIP":"10.1.70.162","hosts":[{"ip":"10.1.69.235","hostName":"master69236"},{"ip":"10.1.69.236","hostName":"node69235"}]}'
  const imageAddrInfo = ctx.request.body;
  try {
    const result = await serviceHost.addImageAddrJob(imageAddrInfo)
    ctx.body = result
  } catch (error) {
    console.error('创建镜像地址时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})


router.delete('/imagesAddr', async (ctx) => {
  //curl -X DELETE "http://10.1.70.162:8000/api/imagesAddr" -H "Content-Type: application/json" -d '{"clusterId":"oic96p96","imageAddr":"2ohqucd7","hosts":[{"ip":"10.1.69.235","hostName":"master69236"},{"ip":"10.1.69.236","hostName":"node69235"}]}'
  const imageAddrInfo = ctx.request.body;
  try {
    const result = await serviceHost.removeImageAddrJob(imageAddrInfo);
    ctx.body = result;
  } catch (error) {
    console.error('删除集群信息时发生错误:', error.message || error);
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
});


//查询镜像仓库地址ansible-playbook -i inventory_path query.yml -e save_dir
router.get('/imagesAddr', async (ctx) => {
  //curl -X GET -H "Content-Type: application/json" http://10.1.70.162:8000/api/imagesAddr?id=vn24ubxe
  try {
    const id = ctx.request.query.id;
    const result = await serviceHost.getImageAddrJob(id);
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




module.exports = router