const KoaRouter = require('koa-router');
const router = new KoaRouter();
//const serviceHost = require('../service/login')

router.post('/user/login', async (ctx, next) => {
  return ctx.body = {
    code: 20000,
    data: "",
    status: "ok"
  };
})

router.post('/user/info', async (ctx, next) => {
  return ctx.body = {
    code: 20000,
    data: "",
    status: "ok"
  };
})

router.post('/user/logout', async (ctx, next) => {
  return ctx.body = {
    code: 20000,
    data: "",
    status: "ok"
  };
})

module.exports = router