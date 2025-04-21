const KoaRouter = require('koa-router');
const router = new KoaRouter();

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


//用于测试接口
router.get('/backend/available', async (ctx, next) => {
  return ctx.body = {
    code: 20000,
    data: "",
    status: "ok"
  };
});

module.exports = router