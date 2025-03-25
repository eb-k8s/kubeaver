const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const os = require('os');

async function getHostsYamlFile(data, clusterId) {
  // 组织 YAML 数据
  const hosts = {};
  const kubeControlPlane = { hosts: {} };
  const kubeNode = { hosts: {} };
  const etcdHosts = { hosts: {} };
  // 遍历 clusterInfo.roles，构建 hosts 和子角色
  data.hosts.forEach((roleInfo) => {
    const { ip, hostName, role, user, password } = roleInfo;
    // 添加到 hosts 中
    hosts[hostName] = {
      ansible_host: ip,
      ip: ip,
      access_ip: ip,
      ansible_user: user,
      ansible_become_password: password,
    };

    // 根据角色组织子角色
    if (role === 'master') {
      kubeControlPlane.hosts[hostName] = {};
      kubeNode.hosts[hostName] = {};
      // 同时将 master 添加到 etcd 的 hosts 中
      etcdHosts.hosts[hostName] = {};
    } else if (role === 'node') {
      kubeNode.hosts[hostName] = {};
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
  //const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-'));
  //存储在指定目录/data/inventory目录
  const currentDir = process.cwd();
  // 使用相对路径
  let inventoryPath = path.join(currentDir, '/data/inventory', `inventory-${clusterId}`);
  if (!fs.existsSync(inventoryPath)) {
    fs.mkdirSync(inventoryPath, { recursive: true });
  }
  //let inventoryPath = '/root/.wn/kubeaver2/backend/data/inventory/inventory-' + clusterId
  const outputPath = path.join(inventoryPath, 'hosts.yaml');
  fs.writeFileSync(outputPath, yamlStr, 'utf8');
  return outputPath;
}

module.exports = {
  getHostsYamlFile,
};