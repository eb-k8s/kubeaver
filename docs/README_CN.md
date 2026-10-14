
<h1 align="center">

  <img src="../docs/imgs/logo_with_kubeaver.png" height="150px" style="vertical-align: middle;" />

  <img align="right" alt="conformance-icon" width="75" height="120" src="https://www.cncf.io/wp-content/uploads/2020/07/certified_kubernetes_color-1.png">

</h1>

> **注意：** Kubeaver 是通过 [CNCF 一致性认证的 Kubernetes 安装工具](https://www.cncf.io/training/certification/software-conformance/)。

[![Static Badge](https://img.shields.io/badge/CNCFStatus-Certified-informational)](https://www.cncf.io/training/certification/software-conformance/)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/eb-k8s/kubeaver/build_package.yaml)](https://github.com/eb-k8s/kubeaver/actions/workflows/build_package.yaml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/eb-k8s/kubeaver)](https://github.com/eb-k8s/kubeaver/releases)

Kubeaver 是一个用于快速部署高可用 Kubernetes (K8s) 集群的工具，支持**离线和在线（开发中）**部署方式。项目基于 [kubespray](https://github.com/kubernetes-sigs/kubespray)，利用 Ansible 自动化部署任务，并提供友好的**图形化界面**。更多使用方法请参考 **[文档](https://eb-k8s.github.io/kubeaver/)**。

English [README](../README.md)

## 功能特性

* 集群管理  
* 集群部署（离线集群部署） 
* 任务管理
* 任务耗时统计
* 任务实时输出
* 节点管理  
* 离线包管理
* 主机管理

## 系统架构

<div align="center">
  <img src="../docs/imgs/arch_cn.png" alt="系统架构" />
</div>

## 截图展示

<table>
    <tr>
        <td width="33%"><img src="../docs/imgs/screenshots/clusterManagement.png"></td>
        <td width="33%"><img src="../docs/imgs/screenshots/task.png"></td>
    </tr>
    <tr>
        <td width="33%"><img src="../docs/imgs/screenshots/taskinstance.png"></td>
        <td width="33%"><img src="../docs/imgs/screenshots/taskTimeStatistics.png"></td>
    </tr>
    <tr>
        <td width="33%"><img src="../docs/imgs/screenshots/hostManagement.png"></td>
        <td width="33%"><img src="../docs/imgs/screenshots/offlinePackages.png"></td>
    </tr>
</table>

## 兼容性

Kubeaver 1.0.0 默认后端版本为 v1.0.0-125，支持 Kubernetes 1.25 到 1.27 版本。若需支持 1.28 到 1.30，可修改 Docker Compose 配置。

| 前端版本 | 后端版本 | 支持的 Kubernetes 版本 |
| -------- | -------- | ---------------------- |
| 1.0.0 | v1.0.0-125 | 1.25.x–1.27.x |
| 1.0.0 | v1.0.0-128 | 1.28.x–1.30.x |
| 1.0.1 | v1.0.0-125 | 1.25.x–1.27.x |
| 1.0.1 | v1.0.0-128 | 1.28.x–1.30.x |
| 1.0.1 | v1.0.1-131 | 1.31.x–1.33.x |
| 1.0.2 | v1.0.0-125 | 1.25.x–1.27.x |
| 1.0.2 | v1.0.0-128 | 1.28.x–1.30.x |
| 1.0.2 | v1.0.1-131 | 1.31.x–1.33.x |
| 1.0.2 | v1.0.2-134 | 1.34.x–1.36.x |

说明：

* 前端版本：对应 Kubeaver 的前端版本，如 1.0.0、1.0.1 和 1.0.2。
* 后端 v1.0.0-125（默认）：支持 Kubernetes 1.25 到 1.27。
* 后端 v1.0.0-128：支持 Kubernetes 1.28 到 1.30。
* 后端 v1.0.1-131：适用于 Kubeaver 1.0.1 和 1.0.2，支持 Kubernetes 1.31 到 1.33。
* 后端 v1.0.2-134：适用于 Kubeaver 1.0.2，支持 Kubernetes 1.34 到 1.36。

## 安装与运行 Kubeaver

**系统要求：**

Linux 主机：

- 软件：
  - docker 20.10.10-ce+
- 硬件：
  - CPU: 2 vCPU
  - 内存：4 GB
  - 磁盘：60 GB

**下载安装包：**

1. 访问 Kubeaver 发布页面。
2. 下载所需版本的在线或离线安装包。
   下载安装包请访问 **[Kubeaver 发布页面](https://github.com/eb-k8s/kubeaver/releases)** 并按说明操作。
3. 使用 tar 解压安装包：

```shell
tar xzvf kubeaver-offline-installer-1.0.0.tgz
```
4. 切换到安装目录：
~~~shell
cd kubeaver-offline-installer-1.0.0
~~~

5. 运行 start.sh 安装并启动 Kubeaver：

```shell
./start.sh
```

安装完成后，可通过 80 端口访问 Kubeaver。

### 离线包导入

在部署 Kubernetes 集群前，需要根据需求导入基础包和扩展包。基础包包含 K8s 集群部署所需的核心组件及 Flannel 网络插件。如需使用 Calico，请导入 Calico 扩展包。请根据目标集群节点的操作系统导入对应的操作系统扩展包。

以下示例展示如何下载 v1.27.10 版本的 Kubernetes 基础包和 CentOS 7 操作系统扩展包：

```shell
# 下载基础包
cd ./deploy/data/kubeaver/offline   

docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10
docker run -d --name kubeaver_offline ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10  
docker cp kubeaver_offline:/root/base_k8s_v1.27.10.tgz .
docker rm -f kubeaver_offline    ##删除容器

# 下载操作系统包
docker pull ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
docker run -d --name kubeaver_oslib ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0 
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
docker rm -f kubeaver_oslib    ##删除容器
```
获得离线包 `base_k8s_v1.27.10.tgz、extend_CentOS_7_Core.tgz` 后，导入至 Kubeaver。

点击查看更详细的离线包下载方法：[离线包下载](../docs/offline_package.md)

### 部署 K8s 集群

1. 在**主机管理**中添加待部署 K8s 集群的主机。
2. 在**集群管理**界面，选择集群版本、网络插件及包含的主机，创建集群。
3. 点击**保存**，然后在**集群管理**界面选择新建集群并点击**部署**开始安装。
4. 可在**任务队列**查看任务状态和进度，或在**任务历史**查看运行/完成的任务。

#### K8s 节点要求

- 控制节点
  - 内存：2 GB
- 工作节点
  - 内存：2 GB
- 操作系统
  - **Ubuntu** 22.04
  - **CentOS** 7
  - **Rocky Linux** 9
  - **openEuler** 22.03

**注意：** Kubernetes 1.34–1.36 仅支持 Ubuntu 22.04 和 Rocky Linux 9。

## 支持的组件

- 核心组件
  - [kubernetes](https://github.com/kubernetes/kubernetes) 
  - [etcd](https://github.com/etcd-io/etcd) 
  - [containerd](https://containerd.io/) 
- 网络插件
  - [cni-plugins](https://github.com/containernetworking/plugins) 
  - [calico](https://github.com/projectcalico/calico) 
  - [flannel](https://github.com/flannel-io/flannel) 
- 应用组件
  - [coredns](https://github.com/coredns/coredns) 

## 许可证

Kubeaver 以 [Apache 2.0](../LICENSE) 协议发布。
