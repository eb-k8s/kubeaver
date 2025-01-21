const fs = require('fs');
const Redis = require('ioredis');
const path = require('path');

const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

async function offlinePackagesPath(offlinePackage) {
  let data = {
    offlinePackagePath: '',
    kubeVersion: '',
    kubesprayPath: '',
    imageArch: '',
  }
  //从redis中读取离线包的路径
  let packageKey = `offline_package:${offlinePackage}`
  try {
    const packageInfo = await redis.hgetall(packageKey);
    data.offlinePackagePath = packageInfo.path
    data.kubeVersion = packageInfo.kube_version;
    data.imageArch = packageInfo.image_arch;
    //获取kubespray路径返回去
    data.kubesprayPath = path.join(__dirname, `../ansible/kubespray/${packageInfo.kubespray_version}`);

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