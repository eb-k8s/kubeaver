const { getK8sCluster } = require('../service/cluster');
const { getNodeList } = require('../service/node');
const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1', // Docker环境用服务名，本地开发用localhost
  port: process.env.REDIS_PORT || 6379,
};

const redis = new Redis(redisConfig);

function startScheduler() {
  // 定义获取状态并更新数据库的函数
  async function updateStatus() {
    try {
      const result = await getK8sCluster();
      if (!result.data || !Array.isArray(result.data)) {
        console.error('Invalid data received from getK8sCluster:', result.data);
        return;
      }
      for (const item of result.data) {
        try {
          const clusterExists = await redis.exists(`k8s_cluster:${item.id}:baseInfo`);
          if (!clusterExists) {
            console.log(`Cluster ID ${item.id} no longer exists, skipping update.`);
            continue;
          }
          await getNodeList(item.id);
        } catch (nodeError) {
          console.error(`Error fetching node list for cluster ID ${item.id}:`, nodeError);
        }
      }
      //console.log('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  // 设置定时任务，每分钟执行一次
  setInterval(updateStatus, 60 * 1000);
}

module.exports = { startScheduler };
