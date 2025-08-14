const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

//获取目录结构
// Load config.yaml
//const configPath = path.join(__dirname, '../config.yaml');
//const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

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
          // if (isK8sCache) {
          //   const isK8sVersion = isVersionInRange(file, config.k8s_versions.min_version, config.k8s_versions.max_version);
          //   directoryEntry.inVersionRange = isK8sVersion ? 'true' : 'false';
          // }

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
  return {
    code: 20000,
    data: treeStructure,
    msg: "获取离线包信息成功",
    status: "ok"
  };
}


module.exports = {
  getOfflineContents,
};
