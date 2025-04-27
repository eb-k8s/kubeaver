const Redis = require('ioredis');
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1', // Docker环境用服务名，本地开发用localhost
  port: process.env.REDIS_PORT || 6379,
};

const redis = new Redis(redisConfig);

//查找具体的某个任务的哈希值,prefix 'k8s_cluster:test:tasks:' suffix  '123456789'  
async function findHashKeys(prefix, suffix) {
  const nodekey = []; // 存储找到的哈希键
  let cursor = '0';
  do {
    // 使用 SCAN 命令查找所有匹配的键
    const result = await redis.scan(cursor, 'MATCH', `${prefix}*`);
    cursor = result[0]; // 更新游标
    const foundKeys = result[1]; // 找到的键
    // 检查每个键是否包含 IP 部分
    for (const key of foundKeys) {
      if (key.includes(suffix)) {
        nodekey.push(key); // 添加到结果中
      }
    }
  } while (cursor !== '0'); // 直到游标返回到 0
  return nodekey;
}

//获取redis中的输出数据
async function getTaskOutput(id, ip, timeID) {
  const prefix = `k8s_cluster:${id}:tasks:${ip}`;
  const suffix = `${timeID}`;
  const hashKeys = await findHashKeys(prefix, suffix);
  // 从 Redis 查询数据
  const output = await redis.hgetall(hashKeys[0]);
  if (output) {
    return output; // 返回 stdout 输出  
  } else {
    throw new Error('Task output not found');
  }
}

module.exports = {
  findHashKeys,
  getTaskOutput,
};