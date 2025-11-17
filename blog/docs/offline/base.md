---
title: 基础包功能
---
# 基础包功能
## 概述

k8s基础包主要包括k8s组件（coredns、etcd、kube-apiserver、kube-controller-manager、kube-proxy和kube-scheduler）、网络插件flannelv0.22.0和metrics-server。涉及到的工具软件有net-tools、nmap、tcpdump、sysstat和iotop。


### 离线包架构

[![离线包架构图](/images/offlinefw.png)](/images/offlinefw.png)

### 基础包下载

以k8s v1.27.10版本为例

 ~~~ shell
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10
docker run -d --name kubeaver_offline ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10  
# 获取到基础包
docker cp kubeaver_offline:/root/base_k8s_v1.27.10.tgz .
# 删除容器
docker rm -f kubeaver_offline
 ~~~
获取到base_k8s_v1.27.10.tgz基础包之后，通过kubeaver离线包导入，导入到offline目录下即可。


### 操作系统包下载

初次部署必须选择与主机匹配的操作系统进行下载。
以CentOS_7为例

~~~shell
docker pull ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
docker run -d --name kubeaver_oslib ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
# 获取到操作系统依赖包
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
# 删除容器
docker rm -f kubeaver_oslib
~~~

获取到extend_CentOS_7_Core.tgz之后，通过kubeaver离线包导入，导入到offline目录下即可。


