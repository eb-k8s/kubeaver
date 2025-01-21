const KoaRouter = require('koa-router');
const router = new KoaRouter();
const serviceHost = require('../service/host')

//添加主机
router.post('/addhost', async(ctx, next) => {
  
  const { hostIP, hostPort, user, password} = ctx.request.body;

  try {
    const result = await serviceHost.addHost(hostIP, hostPort, user, password);  
    ctx.body = result;
  } catch (error) {
    ctx.body = {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
})
//获取主机列表
router.get('/hosts', async(ctx, next) => {
  try {
    const data = await serviceHost.getHosts();
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

//获取未被使用的主机列表
router.get('/hosts/available', async(ctx, next) => {
  try {
    const data = await serviceHost.getAvailableHosts();
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

//删除主机
router.delete('/deletehost/:hostid', async(ctx, next) => {
  const hostid = ctx.params.hostid;
  try {
    const data = await serviceHost.deleteHost(hostid);
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

module.exports = router
