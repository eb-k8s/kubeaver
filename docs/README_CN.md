# Kubeaver
一个基于 [kubespray](https://github.com/kubernetes-sigs/kubespray) 的图形化 Kubernetes (K8s) 集群管理工具，支持离线安装与维护。

Kubeaver能够在完全离线的情况下部署K8s集群，你可以根据你所需要部署的K8s集群版本下载对应的离线包并导入Kubeaver，即可快速一键开启部署。

Kubeaver提供了集群管理的基本操作，你可以使用Kubeaver进行集群的部署、升级、扩缩容、重置等操作。


:construction: 该项目目前处于开发阶段（进行中）。

[English](../README.md)

## 特色功能

实时进度统计，每个任务提供详细的时间统计。

无缝接入容器云

## 快速开始


## 支持的操作系统

- **Ubuntu** 22.04
- **CentOS** 7
- **Rocky Linux** 9

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

这些限制由 Kubever 保障，您的工作负载实际需求可能有所不同

- 控制平面
  - 内存: 2 GB
- 工作节点
  - 内存: 1 GB

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)