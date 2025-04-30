/**
 * 根据 Kubernetes 版本获取对应的数据库编号
 * @param k8sVersion Kubernetes 版本号 (如 "v1.25.10")
 * @param configPath 配置文件路径 (可选)
 * @returns 对应的数据库编号 (数字类型)
 * @throws 如果版本不匹配或配置无效
 */
async function getDatabaseByK8sVersion(k8sVersion, configPath = '../config.yaml') {
  // 1. 加载配置文件
  const yaml = require('js-yaml');
  const fs = require('fs');
  const path = require('path');
  // 构建绝对路径
  const absoluteConfigPath = path.resolve(__dirname, configPath);
  const config = yaml.load(fs.readFileSync(absoluteConfigPath, 'utf8'));
  // 2. 验证配置格式
  if (!config?.database_mapping || !Array.isArray(config.database_mapping)) {
    throw new Error('Invalid config: database_mapping not found or not an array');
  }

  // 3. 解析版本号 (格式: v<major>.<minor>.<patch>)
  const versionMatch = k8sVersion.match(/^v(\d+)\.(\d+)\.\d+$/);
  if (!versionMatch) {
    throw new Error(`Invalid Kubernetes version format: ${k8sVersion}`);
  }

  const major = parseInt(versionMatch[1], 10);
  const minor = parseInt(versionMatch[2], 10);

  // 4. 查找匹配的数据库配置
  for (const mapping of config.database_mapping) {
    // 解析最小版本
    const minMatch = mapping.min_version?.match(/^v(\d+)\.(\d+)$/);
    if (!minMatch) continue;
    
    const minMajor = parseInt(minMatch[1], 10);
    const minMinor = parseInt(minMatch[2], 10);

    // 解析最大版本
    const maxMatch = mapping.max_version?.match(/^v(\d+)\.(\d+)$/);
    if (!maxMatch) continue;
    
    const maxMajor = parseInt(maxMatch[1], 10);
    const maxMinor = parseInt(maxMatch[2], 10);

    // 5. 检查版本范围
    if (major === minMajor && major === maxMajor) {
      if (minor >= minMinor && minor <= maxMinor) {
        const dbNumber = parseInt(mapping.database, 10);
        if (isNaN(dbNumber)) {
          throw new Error(`Invalid database number: ${mapping.database}`);
        }
        return dbNumber;
      }
    }
  }

  throw new Error(`No database mapping found for Kubernetes version: ${k8sVersion}`);
}

module.exports = {
  getDatabaseByK8sVersion,
};