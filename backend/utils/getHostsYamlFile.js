const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const os = require('os');
const Redis = require('ioredis');
const redisConfig = {
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT,
};

const redis = new Redis(redisConfig);

async function getHostsYamlFile(data, clusterId) {
  // 从 Redis 获取 master1 的名称
  const baseInfoKey = `k8s_cluster:${clusterId}:baseInfo`;
  const baseInfo = await redis.hgetall(baseInfoKey);
  const master1Name = baseInfo.master1; // 假设 master1 名称存储在 baseInfo 中

  // 组织 YAML 数据
  const hosts = {};
  const kubeControlPlane = { hosts: {} };
  const kubeNode = { hosts: {} };
  const etcdHosts = { hosts: {} };

  // 先处理 master1
  data.hosts.forEach((roleInfo) => {
    const { ip, hostName, role, user, password } = roleInfo;
    if (hostName === master1Name) {
      hosts[hostName] = {
        ansible_host: ip,
        ip: ip,
        access_ip: ip,
        ansible_user: user,
        ansible_become_password: password,
      };

      if (role === 'master') {
        kubeControlPlane.hosts[hostName] = {};
        kubeNode.hosts[hostName] = {};
        etcdHosts.hosts[hostName] = {};
      } else if (role === 'node') {
        kubeNode.hosts[hostName] = {};
      }
    }
  });

  // 处理其余的主机
  data.hosts.forEach((roleInfo) => {
    const { ip, hostName, role, user, password } = roleInfo;
    if (hostName !== master1Name) {
      hosts[hostName] = {
        ansible_host: ip,
        ip: ip,
        access_ip: ip,
        ansible_user: user,
        ansible_become_password: password,
      };

      if (role === 'master') {
        kubeControlPlane.hosts[hostName] = {};
        kubeNode.hosts[hostName] = {};
        etcdHosts.hosts[hostName] = {};
      } else if (role === 'node') {
        kubeNode.hosts[hostName] = {};
      }
    }
  });

  // 构建最终的 YAML 数据结构
  const yamlData = {
    all: {
      hosts: hosts,
      children: {
        kube_control_plane: kubeControlPlane,
        kube_node: kubeNode,
        etcd: etcdHosts,
        k8s_cluster: {
          children: {
            kube_control_plane: {},
            kube_node: {}
          }
        },
        calico_rr: {
          hosts: {}
        }
      }
    }
  };

  // 将数据转换为 YAML 格式
  const yamlStr = yaml.dump(yamlData);
  // 指定保存路径(离线部署替换掉相应hosts.yaml文件)
  //const currentDir = process.cwd();
  let inventoryPath = path.join(__dirname, '../data/inventory', `inventory-${clusterId}`);
  //let inventoryPath = path.join(currentDir, '/data/inventory', `inventory-${clusterId}`);
  if (!fs.existsSync(inventoryPath)) {
    fs.mkdirSync(inventoryPath, { recursive: true });
  }
  const outputPath = path.join(inventoryPath, 'hosts.yaml');
  fs.writeFileSync(outputPath, yamlStr, 'utf8');
  return outputPath;
}

module.exports = {
  getHostsYamlFile,
};