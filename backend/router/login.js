const KoaRouter = require('koa-router');
const router = new KoaRouter();
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
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


//用于测试接口
router.get('/user/test', async (ctx, next) => {
  try {
    // Read the config.yaml file
    console.log('Current directory:', __dirname);
    const configPath = path.join(__dirname, '../config.yaml');
    console.log(configPath)
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    // Check if the kubeaver_version matches
    const expectedVersion = '1.0.0'; // replace with the actual expected version
    if (config.kubeaver_version === expectedVersion) {
      ctx.body = {
        code: 20000,
        data: "Version matches",
        status: "ok"
      };
    } else {
      ctx.body = {
        code: 40000,
        data: "Version mismatch",
        status: "error"
      };
    }
  } catch (e) {
    console.log(e)
    ctx.body = {
      code: 50000,
      data: "Error reading config file",
      status: "error"
    };
  }
});

module.exports = router