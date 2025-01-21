const KoaRouter = require('koa-router');
const router = new KoaRouter();
const Redis = require('ioredis');
const { getTaskOutput } = require('../utils/getTaskOutput');
const { getActiveTasks } = require('../service/task')

const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

//任务实时输出接口
router.all('/websocket/:id/:ip/:timeID', async (ctx) => {
  const ws = ctx.websocket;
  const urlParts = ctx.request.url.split('/').filter(Boolean);
  const id = urlParts[1];
  const ip = urlParts[2];
  const timeID = urlParts[3];
  // Redis Pub/Sub 客户端
  const subscriber = new Redis({
    port: 6379,
    host: "127.0.0.1",
  });
  const data = await getTaskOutput(id, ip, timeID);
  ws.send(data.stdout);
  const channel = `k8s_cluster:${id}:tasks:${ip}:${data.task}:${timeID}`;
  subscriber.subscribe(channel);
  subscriber.on('message', (chan, message) => {
    if (chan === channel) {
      ws.send(message);
    }
  });

  ws.on('close', () => {
    subscriber.unsubscribe(channel);
  });
});

router.all('/activeTasks/:id', async (ctx) => {
  const ws = ctx.websocket;
  const urlParts = ctx.request.url.split('/').filter(Boolean);
  const id = urlParts[1];

  let taskData;
  let channelsToSubscribe = [];
  // Redis Pub/Sub 客户端
  const subscriber = new Redis({
    port: 6379,
    host: "127.0.0.1",
  });
  const fetchAndUpdateTaskData = async () => {
    try {
      const result = await getActiveTasks(id);
      taskData = result.data;
      // 清空之前信道中的信息
      if (channelsToSubscribe.length > 0) {
        subscriber.unsubscribe(...channelsToSubscribe);
      }

      // 收集所有需要订阅的频道，重新设置channelsToSubscribe为空值
      channelsToSubscribe = [];
      for (const taskName in taskData) {
        for (const job of taskData[taskName]) {
          if (job.status === 'running') {
            let nodeKey = `k8s_cluster:${id}:taskProgress:${job.ip}:${taskName}:${job.timestamp}`;
            channelsToSubscribe.push(nodeKey);
            let taskProcessInfo = await redis.hgetall(nodeKey);
            job.current_task = taskProcessInfo.current_task;
            job.task_counts = taskProcessInfo.task_counts;
          }
        }
      }

      // 订阅所有收集的频道
      subscriber.subscribe(...channelsToSubscribe, (err, count) => {
        if (err) {
          console.error(`没有活跃的任务: ${err.message}`);
        } else {
          //console.log(`Subscribed successfully! Currently subscribed to ${count} channels.`);
        }
      });

      ws.send(JSON.stringify(taskData));
    } catch (error) {
      console.error(`获取活跃任务失败: ${error.message}`);
      ws.send(JSON.stringify({ error: 'Failed to fetch task data' }));
    }
  };

  // Initial fetch and update
  await fetchAndUpdateTaskData();

  // 定时更新数据
  const intervalId = setInterval(fetchAndUpdateTaskData, 10000); // 10 seconds interval

  subscriber.on('message', (chan, message) => {
    // 更新 taskData 中的 current_task 值
    for (const taskName in taskData) {
      for (const job of taskData[taskName]) {
        const parsedMessage = JSON.parse(message);
        if (`k8s_cluster:${id}:taskProgress:${job.ip}:${taskName}:${job.timestamp}` === chan) {
          job.current_task = parsedMessage.current_task;
          job.task_counts = parsedMessage.task_counts;
        }
      }
    }
    // 发送更新后的 taskData 给 WebSocket 客户端
    ws.send(JSON.stringify(taskData));
  });

  ws.on('close', () => {
    if (channelsToSubscribe.length > 0) {
      subscriber.unsubscribe(...channelsToSubscribe);
    }
    clearInterval(intervalId);
  });
});
module.exports = router;