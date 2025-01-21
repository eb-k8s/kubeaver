const KoaRouter = require('koa-router');
const router = new KoaRouter();
const serviceResources = require('../service/resources')

//获取离线包列表
router.get('/resources', async (ctx, next) => {
  try {
    const data = await serviceResources.getResourceList();
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

//获取离线包详细信息
// router.get('/resources/detail/:package_name', async(ctx, next) => {
router.get('/resources/detail', async (ctx, next) => {
  // const { package_name } = ctx.params;  
  const { package_name } = ctx.request.query;
  try {
    const data = await serviceResources.getResourceDetail(package_name);
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