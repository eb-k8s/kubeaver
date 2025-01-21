const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const Redis = require('ioredis');

const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

// 获取资源列表
async function getResourceList() {
  try {
    // 查询并返回所有数据
    const keys = await redis.keys('offline_package:*');
    const resourcesInfo = await Promise.all(keys.map(async (key) => {
      const data = await redis.hgetall(key);
      data.network_plugin = JSON.parse(data.network_plugin);
      return data;
    }));
    return {
      code: 20000,
      data: resourcesInfo,
      msg: "",
      status: "ok"
    };
  } catch (error) {
    console.error('获取资源列表时发生错误:', error.message || error);
    return {
      code: 50000,
      data: "",
      msg: error.message || '获取资源信息失败！',
      status: "error"
    };
  }
}

// 获取资源详情
async function getResourceDetail(package_name) {
  try {
    const redisKey = `offline_package:${package_name}`;
    const result = await redis.hgetall(redisKey);
    if (!result || Object.keys(result).length === 0) throw new Error('资源未找到');

    const yamlFilePath = path.join(result.path, 'package.yml');
    if (fs.existsSync(yamlFilePath)) {
      const fileContents = fs.readFileSync(yamlFilePath, 'utf8');
      const data = yaml.load(fileContents);

      return {
        code: 20000,
        data: {
          package_name: result.package_name,
          import_status: result.import_status,
          import_time: result.import_time,
          container_engine: result.container_engine,
          config: data
        },
        msg: "",
        status: "ok"
      };
    } else {
      throw new Error('package.yml 文件不存在');
    }
  } catch (error) {
    console.error('获取资源详情时发生错误:', error.message || error);
    return {
      code: 50000,
      data: "",
      msg: error.message || '获取资源详细信息失败！',
      status: "error"
    };
  }
}


module.exports = {
  getResourceList,
  getResourceDetail,
};
