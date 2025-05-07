const fs = require('fs');
const Redis = require('ioredis');
const yaml = require('js-yaml');
const path = require('path');
const { createAnsibleQueue } = require('./ansibleQueue');
const { getK8sCluster } = require('../service/cluster');
const redisConfig = {
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT,
};

const redis = new Redis(redisConfig);
async function initQueue() {
  // 1. 读取环境变量 KUBESPRAY_VERSION
  const envKubesprayVersion = process.env.KUBESPRAY_VERSION;
  if (!envKubesprayVersion) {
    console.error('环境变量 KUBESPRAY_VERSION 未设置');
    return {
      code: 40001,
      msg: '环境变量 KUBESPRAY_VERSION 未设置',
      status: 'error'
    };
  }

  // 2. 读取 config.yaml 文件
  const absoluteConfigPath = path.resolve(__dirname, '../config.yaml');
  const config = yaml.load(fs.readFileSync(absoluteConfigPath, 'utf8'));
  // 2. 验证配置格式
  if (!config?.database_mapping || !Array.isArray(config.database_mapping)) {
    throw new Error('Invalid config: database_mapping not found or not an array');
  }

  // 3. 获取集群信息
  const result = await getK8sCluster();
  for (const item of result.data) {
    const k8sVersion = item.version;
    let matchedConfig = null;
    // 5. 查找匹配的 database_mapping 条目
    for (const mapping of config.database_mapping) {
      // 检查 KUBESPRAY_VERSION 是否匹配
      if (envKubesprayVersion !== mapping.kubespray_version) {
        continue;
      }

      // 检查 k8sVersion 是否在 min_version 和 max_version 范围内
      if (
        compareVersions(k8sVersion, mapping.min_version) >= 0 &&
        compareVersions(k8sVersion, mapping.max_version) <= 0
      ) {
        matchedConfig = mapping;
        break;
      }
    }

    // 5. 如果没有匹配的配置，跳过该集群
    if (!matchedConfig) {
      console.error(`未匹配的配置: KUBESPRAY_VERSION=${envKubesprayVersion}, k8sVersion=${k8sVersion}`);
      continue;
    }

    // 6. 检查并发数是否设置
    if (!item.taskNum) {
      console.error(`未设置并发数: ${item.id}`);
      return {
        code: 40000,
        msg: `未设置并发数: ${item.id}`,
        status: 'error'
      };
    }

    // 7. 创建队列（可传入 matchedConfig.database 用于分库）
    await createAnsibleQueue(
      item.id,
      parseInt(item.taskNum, 10),
      k8sVersion
    );
  }

  return {
    code: 200,
    msg: '队列初始化完成',
    status: 'success'
  };
}

/**
 * 比较版本号（忽略修订号，只比较主版本和次版本）
 * @param {string} v1 - 版本号，如 "1.25.10" 或 "v1.25.10"
 * @param {string} v2 - 版本号，如 "v1.25" 或 "1.27"
 * @returns {number} - 0（相等）、1（v1 > v2）、-1（v1 < v2）
 */
function compareVersions(v1, v2) {
  // 统一去除 'v' 前缀，并按 '.' 分割
  const normalize = (version) => version.replace(/^v/, '').split('.').slice(0, 2).map(Number);
  const v1Parts = normalize(v1);
  const v2Parts = normalize(v2);

  // 比较主版本和次版本
  for (let i = 0; i < 2; i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  return 0;
}

module.exports = {
  initQueue,
};
