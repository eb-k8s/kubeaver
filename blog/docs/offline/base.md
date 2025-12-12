---
title: 基础包功能
---
# 基础包功能
## 概述

k8s基础包主要包括k8s组件（coredns、etcd、kube-apiserver、kube-controller-manager、kube-proxy和kube-scheduler）、网络插件flannelv0.22.0和metrics-server。涉及到的工具软件有net-tools、nmap、tcpdump、sysstat和iotop。


## 离线包架构

[![离线包架构图](/images/offlinefw.png)](/images/offlinefw.png)

## 基础包下载

下载地址：https://github.com/eb-k8s/kubeaver/pkgs/container/kubeaver%2Fkubeaver_offline

以**k8s v1.27.10**版本为例

1. 下载k8s v1.27.10版本离线包

~~~ shell
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10
~~~

2. 启动kubeaver_offline容器，将压缩包拷贝出来

 ~~~ shell
docker run -d --name kubeaver_offline ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10  
# 获取到基础包
docker cp kubeaver_offline:/root/base_k8s_v1.27.10.tgz .
 ~~~

3. 删除容器

~~~shell
docker rm -f kubeaver_offline
~~~

获取到base_k8s_v1.27.10.tgz基础包之后，通过kubeaver平台的离线包导入功能，将k8s基础包到offline目录下即可（会自动解压）。(用户名：密码 admin:admin)

[![kubeaver平台离线包功能](/images/kubeaver_offline.png)](/images/kubeaver_offline.png)

[![kubeaver平台上传离线包](/images/kubeaver_offline_2.png)](/images/kubeaver_offline_2.png)

## 操作系统包下载

初次部署必须选择与主机匹配的操作系统进行下载，下载地址：https://github.com/orgs/eb-k8s/packages。

以**CentOS_7**为例

1. 下载CentOS_7离线包

~~~shell
docker pull ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
~~~

2. 启动kubeaver_oslib容器，将tgz包拷贝出来

~~~shell

docker run -d --name kubeaver_oslib ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
~~~

4. 删除容器

~~~shell
docker rm -f kubeaver_oslib
~~~

获取到extend_CentOS_7_Core.tgz之后，通过kubeaver平台离线包导入功能，将操作系统包放到offline目录下即可。


