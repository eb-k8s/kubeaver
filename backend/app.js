const Koa = require('koa');
const websockify = require('koa-websocket');
const bodyParser = require('koa-bodyparser');
const app = websockify(new Koa());
const { initQueue } = require('./service/cluster');
const { startScheduler } = require('./utils/scheduler');
const { startFileWatcher, initOffline } = require('./utils/fileWatcher');
const serve = require('koa-static');
const Router = require('koa-router');
const path = require('path');
const send = require('koa-send');

app.use(bodyParser());

app.use(serve(path.join(__dirname, './static')));
const router = new Router();
router.use('/api', require('./router/host').routes())
router.use('/api', require('./router/resources').routes())
router.use('/api', require('./router/cluster').routes())
router.use('/api', require('./router/node').routes())
router.use('/api', require('./router/task').routes())
router.use('/api', require('./router/common').routes())
router.use('/api', require('./router/login').routes())
app.ws.use(require('./router/websocket').routes())

app.use(router.routes()).use(router.allowedMethods());
app.use(async (ctx, next) => {
  if (ctx.status === 404 && ctx.method === 'GET') {
    await send(ctx, 'index.html', { root: path.join(__dirname, './static') });
  } else {
    await next();
  }
});
initOffline();
//startFileWatcher();
initQueue();
startScheduler();



app.listen(8000, () => console.log('Server Started...'));


