const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
//const { exec } = require('child_process');
//const util = require('util');
//const execPromise = util.promisify(exec);
// const Redis = require('ioredis');

// const redis = new Redis({
//   port: 6379,
//   host: "127.0.0.1",
// });

// 获取资源列表
// async function getResourceList() {
//   try {
//     // 查询并返回所有数据
//     const keys = await redis.keys('offline_package:*');
//     const resourcesInfo = await Promise.all(keys.map(async (key) => {
//       const data = await redis.hgetall(key);
//       data.network_plugin = JSON.parse(data.network_plugin);
//       return data;
//     }));
//     return {
//       code: 20000,
//       data: resourcesInfo,
//       msg: "",
//       status: "ok"
//     };
//   } catch (error) {
//     console.error('获取资源列表时发生错误:', error.message || error);
//     return {
//       code: 50000,
//       data: "",
//       msg: error.message || '获取资源信息失败！',
//       status: "error"
//     };
//   }
// }

// // 获取资源详情
// async function getResourceDetail(package_name) {
//   try {
//     const redisKey = `offline_package:${package_name}`;
//     const result = await redis.hgetall(redisKey);
//     if (!result || Object.keys(result).length === 0) throw new Error('资源未找到');

//     const yamlFilePath = path.join(result.path, 'package.yml');
//     if (fs.existsSync(yamlFilePath)) {
//       const fileContents = fs.readFileSync(yamlFilePath, 'utf8');
//       const data = yaml.load(fileContents);

//       return {
//         code: 20000,
//         data: {
//           package_name: result.package_name,
//           import_status: result.import_status,
//           import_time: result.import_time,
//           container_engine: result.container_engine,
//           config: data
//         },
//         msg: "",
//         status: "ok"
//       };
//     } else {
//       throw new Error('package.yml 文件不存在');
//     }
//   } catch (error) {
//     console.error('获取资源详情时发生错误:', error.message || error);
//     return {
//       code: 50000,
//       data: "",
//       msg: error.message || '获取资源详细信息失败！',
//       status: "error"
//     };
//   }
// }

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

//获取目录结构
// Load config.yaml
const configPath = path.join(__dirname, '../config.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

function isVersionInRange(version, minVersion, maxVersion) {
  // 提取主版本号和次版本号（例如，从 v1.28.12 提取 v1.28）
  const extractMajorMinor = (v) => v.split('.').slice(0, 2).join('.');

  const versionNum = parseFloat(extractMajorMinor(version).replace('v', ''));
  const minVersionNum = parseFloat(extractMajorMinor(minVersion).replace('v', ''));
  const maxVersionNum = parseFloat(extractMajorMinor(maxVersion).replace('v', ''));

  return versionNum >= minVersionNum && versionNum <= maxVersionNum;
}

async function getOfflineContents() {
  const offlineDir = path.join(__dirname, '../data/offline');

  function readDirRecursive(dir, isK8sCache = false) {
    const result = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file !== 'all_files') { // 过滤掉 all_files 文件夹
          const children = readDirRecursive(filePath, file === 'k8s_cache');
          let directoryEntry = {
            name: file,
            type: 'directory',
            children: children
          };

          // 仅在 k8s_cache 目录下进行版本比较
          if (isK8sCache) {
            const isK8sVersion = isVersionInRange(file, config.k8s_versions.min_version, config.k8s_versions.max_version);
            directoryEntry.inVersionRange = isK8sVersion ? 'true' : 'false';
          }

          result.push(directoryEntry);
        }
      } else {
        result.push({
          name: file,
          type: 'file',
          size: formatBytes(stat.size) // 文件大小
        });
      }
    }
    return result;
  }

  const treeStructure = readDirRecursive(offlineDir);
  //console.log(JSON.stringify(treeStructure, null, 2));
  return treeStructure;
}


module.exports = {
  // getResourceList,
  // getResourceDetail,
  getOfflineContents,
};
