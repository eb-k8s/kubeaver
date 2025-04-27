const fs = require('fs');
const Redis = require('ioredis');
const path = require('path');
//const yaml = require('js-yaml');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1', // Docker环境用服务名，本地开发用localhost
  port: process.env.REDIS_PORT || 6379,
};

const redis = new Redis(redisConfig);

async function offlinePackagesPath() {
  let data = {
    offlinePackagePath: '',
    kubeVersion: '',
    kubesprayPath: '',
    imageArch: '',
  }
  try {
    //读取配置文件，获取kubespray版本
    //const configPath = path.join(__dirname, '../config.yaml');
    //const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    data.offlinePackagePath = path.join(__dirname, '../data/offline')
    //data.kubeVersion = packageInfo.kube_version;
    //data.imageArch = packageInfo.image_arch;
    data.imageArch = "amd64"
    //获取kubespray路径返回去
    data.kubesprayPath = path.join(__dirname, `../ansible`);

    fs.access(data.offlinePackagePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`离线包路径不存在: ${data.offlinePackagePath}`);
        return {
          code: 50000,
          status: "error",
          message: '离线包路径不存在',
          path: data.offlinePackagePath
        };
      }
    });

    return data

  } catch (error) {
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
}


module.exports = { offlinePackagesPath };