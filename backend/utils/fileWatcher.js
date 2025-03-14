// fileWatcher.js
const path = require('path');
const tar = require('tar');
const fs = require('fs');
const Redis = require('ioredis');
const { exec } = require('child_process');

const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

const offlineDir = path.join(__dirname, '../data/offline');

// 确保目录存在
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  } else {
    //console.log(`目录已存在: ${dir}`);
  }
}
// 初始化
async function initOffline() {
  try {
    await insertInfo();
    ensureDirectory(offlineDir);
    const files = fs.readdirSync(offlineDir);
    const tarFiles = files.filter(file => file.endsWith('.tgz'));
    for (const tarFile of tarFiles) {
      const extractedFiles = [];
      const tarFilePath = path.join(offlineDir, tarFile);
      await tar.x({
        file: tarFilePath,
        C: offlineDir,
        strip: 1,//不要最外层base_package目录
        onentry: (entry) => {
          extractedFiles.push(entry.path);
        }
      });
      console.log(`成功解压 ${tarFile} 到 ${offlineDir}`);
      fs.unlinkSync(tarFilePath);
      console.log(`已删除 ${tarFilePath}`);
      //await processDirectory(offlineDir, extractedFiles[0]);
      // 调用 load.py 脚本
      exec('python3 ./linkPackage/load.py', (error, stdout, stderr) => {
        if (error) {
          console.error(`执行 load.py 时出错: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`load.py 错误输出: ${stderr}`);
          return;
        }
        console.log(`load.py 输出: ${stdout}`);
      });
      //await getListContents();
    }
  } catch (error) {
    console.error('导入离线包时发生错误:', error.message || error);
  }
}

async function startFileWatcher() {
  fs.watch(offlineDir, async (eventType, filename) => {
    if (eventType === 'rename' && filename.endsWith('.tgz')) {
      const filePath = path.join(offlineDir, filename);
      const extractedFiles = [];
      console.log(`检测到新的 tgz 文件: ${filePath}`);
      // Wait for the file transfer to complete
      const isTransferComplete = await waitForFileTransfer(filePath);
      if (!isTransferComplete) {
        console.error(`文件 ${filename} 传输未完成，跳过解压。`);
        return;
      }

      // Verify file integrity
      const isFileIntact = await verifyTarIntegrity(filePath);
      if (!isFileIntact) {
        console.error(`文件 ${filename} 的完整性检查失败，跳过解压。`);
        return;
      }

      await tar.x({
        file: filePath,
        C: offlineDir,
        strip: 1,
        onentry: (entry) => {
          extractedFiles.push(entry.path);
        }
      })
      console.log(`成功解压 ${filename} 到 ${offlineDir}`);
      fs.unlinkSync(filePath);
      console.log(`已删除 ${filePath}`);
      //await processDirectory(offlineDir, extractedFiles[0])
      // 调用 load.py 脚本
      exec('python3 ./linkPackage/load.py', (error, stdout, stderr) => {
        if (error) {
          console.error(`执行 load.py 时出错: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`load.py 错误输出: ${stderr}`);
          return;
        }
        console.log(`load.py 输出: ${stdout}`);
      });
      //await getListContents();
    }
  });
}

// async function processDirectory(directory, offlineName) {
//   const filePath = directory + "/" + offlineName
//   const configFilePath = path.join(filePath, 'package.yml');
//   if (filePath.endsWith('/')) {
//     itemOfflineNamePath = filePath.slice(0, -1); // 去掉末尾的斜杠
//   }
//   const offline = itemOfflineNamePath + '.tgz'
//   const packageByteSize = await getTgzPackageSize(offline);
//   const packageSize = await formatBytes(packageByteSize);
//   if (packageSize !== null) {
//     console.log(`离线包大小: ${packageSize}`);
//   } else {
//     console.log('无法计算离线包大小');
//   }
//   if (fs.existsSync(configFilePath)) {
//     //console.log(`正在处理描述文件: ${configFilePath}`);
//     const fileContents = fs.readFileSync(configFilePath, 'utf8');
//     const data = yaml.load(fileContents);
//     let kubesprayVersion = ''
//     let imageArch = ''
//     let networkPlugin = [];
//     let kubeVersion = '';
//     let containerdVersion = '';
//     let supportedOs = [];
//     let containerdName = '';

//     // 获取信息
//     if (data.kubespray) {
//       kubesprayVersion = data.kubespray.kubespray_version;
//       kubeVersion = data.kubespray.kube_version;
//       imageArch = data.kubespray.image_arch;
//       const containerd = data.kubespray.dependency.files.find(f => f.name === 'containerd');
//       if (containerd) {
//         containerdName = containerd.name;
//         containerdVersion = containerd.version;
//       }
//     }
//     if (data.supported_os) {
//       supportedOs = data.supported_os;
//     }
//     if (data.kubespray.network_plugins) {
//       networkPlugin = data.kubespray.network_plugins.map(plugin => plugin.name);
//     }
//     // 检查包是否存在
//     const packageName = path.basename(filePath);
//     const redisKey = `offline_package:${packageName}`;

//     const packageExists = await redis.exists(redisKey);

//     if (!packageExists) {
//       await redis.hset(redisKey,
//         "kubespray_version", kubesprayVersion,
//         "image_arch", imageArch,
//         "package_name", packageName,
//         "kube_version", kubeVersion,
//         "network_plugin", JSON.stringify(networkPlugin),
//         "container_engine", `${containerdName}-${containerdVersion}`,
//         "operating_system", supportedOs.join(', '),
//         "import_time", new Date().toISOString(),
//         "path", filePath,
//         "packageSize", packageSize
//       );
//     } else {
//       console.log(`包 "${packageName}" 已存在，跳过插入。`);
//     }
//   } else {
//     console.log('未找到 package.yaml 文件');
//   }
//   //}
// }
//判断文件是否完整
async function verifyTarIntegrity(filePath) {
  try {
    // 尝试列出 tar 文件的内容而不解压
    await tar.list({
      file: filePath,
    });
    return true;
  } catch (error) {
    console.error(`Tar 文件完整性检查失败: ${error.message}`);
    return false;
  }
}
//最长时间是5分钟，3000毫秒（3秒），共检查100次
async function waitForFileTransfer(filePath, interval = 3000, maxAttempts = 100) {
  let lastSize = 0;
  let attempts = 0;
  return new Promise((resolve) => {
    const checkFileSize = () => {
      try {
        if (!fs.existsSync(filePath)) {
          console.error(`文件 ${filePath} 不存在，可能已被删除。`);
          resolve(false);
          return;
        }
        const { size } = fs.statSync(filePath);
        if (size === lastSize) {
          resolve(true);
        } else {
          lastSize = size;
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkFileSize, interval);
          } else {
            resolve(false);
          }
        }
      } catch (error) {
        console.error(`检查文件大小时出错: ${err.message}`);
        resolve(false);
      }
    };

    setTimeout(checkFileSize, interval);
  });
}

// async function getTgzPackageSize(filePath) {
//   try {
//     const stats = fs.statSync(filePath);
//     return stats.size; // 返回文件大小，单位为字节
//   } catch (error) {
//     console.error(`无法获取文件大小: ${error.message}`);
//     return null; // 如果出错，返回 null
//   }
// }






//初始化的时候在redis中插入数据，版本信息，支持的k8s版本，以便前端可以进行接口访问
async function insertInfo() {
  const data = {
    "kubeaverVersion": "v1",
    "k8sVersions": ["1.28", "1.29", "1.30"]
  };
  await redis.set('kubeaver_version_1.0.0', JSON.stringify(data));
}

module.exports = { startFileWatcher, initOffline };
