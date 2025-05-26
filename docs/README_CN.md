# Kubeaver

Kubeaver是快速部署高可用Kubernetes (K8s) 集群的工具，支持在线和离线两种方式。项目基于[kubespray](https://github.com/kubernetes-sigs/kubespray)，使用Ansible实现部署任务的自动化，并且提供了用户友好的图形化界面。

Kubeaver具有以下优点：

* 任务高并发，部署集群所需时间不随集群规模增加而显著增加。

* 能够在完全离线的情况下部署K8s集群，你可以根据自己的需求下载离线包导入Kubeaver，即可快速一键部署。

* 提供了集群管理的基本操作，可以使用Kubeaver进行集群的部署、升级、扩缩容、重置操作。

* 支持集群定制化操作，你可以选择自定义集群的组件，如网络插件、应用，同时可以配置集群的高级参数。


:construction: 该项目目前处于开发阶段（进行中）。

[English](../README.md)


## 快速开始

### 安装Docker

使用Docker的官方指引安装Docker：[Install Docker Engine](hhttps://docs.docker.com/engine/install/)，安装完成后运行`docker compose version`命令，确保Docker Compose已正确安装，如果没有，请手动安装。

### 部署Kubeaver

拉取必要的镜像镜像：
```
# 拉取前台镜像
docker pull ghcr.io/dbsave/kubeaver_frontend:v1.0.0
# 拉取后台镜像
docker pull ghcr.io/dbsave/kubeaver_backend:v2.0.0
```
启动Kubeaver:
```
docker compose up -d
```
此时可以访问 http://127.0.0.1:80进入Kubeaver

### 离线包导入


### 部署K8s集群

*  添加主机
*  创建集群
*  部署集群

### 集群管理

* 集群管理
* 节点管理
* 离线包管理

## 支持的操作系统

- **Ubuntu** 22.04
- **CentOS** 7
- **Rocky Linux** 9
- **openEuler** 22.03

## 支持的组件

- Core
  - [kubernetes](https://github.com/kubernetes/kubernetes) 
  - [etcd](https://github.com/etcd-io/etcd) 
  - [containerd](https://containerd.io/) 
- Network Plugin
  - [cni-plugins](https://github.com/containernetworking/plugins) 
  - [calico](https://github.com/projectcalico/calico) 
  - [flannel](https://github.com/flannel-io/flannel) 
- Application
  - [coredns](https://github.com/coredns/coredns) 

## 硬件需求

这些限制由 Kubespray 保障，您的工作负载实际需求可能有所不同

- 控制平面
  - 内存: 2 GB
- 工作节点
  - 内存: 1 GB

## 相关文档

* [How it works](./how_it_works_CN.md)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)