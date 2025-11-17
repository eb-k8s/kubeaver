---
title: 扩展包功能
---
# 扩展包功能
## 概述

k8s基础包中包含k8s组件、flannelv0.22.0和metrics-server，[<span style="color: blue;">操作系统包</span>](base.md)和网络插件包属于扩展包，导入扩展包具体操作如下：
 
### 下载网络插件扩展包
 
以flannel_v0.26.5为例
~~~shell
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_oslib:v1.0
docker run -d --name kubeaver_oslib ghcr.io/eb-k8s/kubeaver/kubeaver_oslib:v1.0 
# 获取到网络插件依赖包
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
~~~


说明：calico v3.25.2支持k8s v1.25.x-1.27.x版本;
calico v3.26.1支持k8s v1.28.x-1.30.x版本。

### 扩展包导入

可通过kubeaver网站👉离线包管理👉右上角离线包上传👉账号admin 密码admin 👉 文件目录offline👉右上角上传，上传之后会自动导入，刷新kubeaver离线包页面可以查看到是否导入成功。


<script setup>
import { ref, computed } from 'vue'
const extendNetwork = ref("flannel_v0.26.5")


const networkPlugins = ref([
  "flannel_v0.26.5",
  "calico_v3.25.2",
  "calico_v3.26.1",
])



const handleExtendNetworkChanged =async (network) =>{
  extendNetwork.value = network;
}



const handleDownloadExtendNetwork = async (network) => {
  var a = document.createElement('a');
  a.href = `/offline/extend_network_${network}.tgz`; // Path to the basic package
  a.download = `extend_network_${network}.tgz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


</script>