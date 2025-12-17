---
title: 快速开始
---
# 快速开始

本指南介绍如何在离线环境下快速搭建kubeaver平台。

Kubeaver平台是一个在离线环境下可快速管理kubernetes集群的一款工具。该平台开箱即用，提供可视化界面，让用户一键导入离线包并快速部署高可用Kubernetes (K8s) 集群。目前适用于amd64架构，支持操作系统CentOS 7、Ubuntu 22.04、Rocky Linux 9和openEuler 22.03。


### 环境准备

- 
  <div style="margin-top: 10px;">
    <a href="../introduce/prepare" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>主机要求</strong>
    </a>
  </div>
- 
  <div style="margin-top: 10px;">
    <a href="../introduce/prepare" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>docker compose命令</strong>
    </a>
  </div>
- 
  <div style="margin-top: 10px;">
    <a href="../introduce/prepare" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>tar命令</strong>
    </a>
  </div>

### 部署kubeaver

1. 访问 [Kubeaver Release 页面](https://github.com/eb-k8s/kubeaver/releases) 下载离线安装包。

2. 解压安装包：
~~~shell
tar xzvf kubeaver-offline-installer-1.0.0.tgz
~~~
3. 切换到安装目录：
~~~shell
cd kubeaver-offline-installer-1.0.0
~~~
4. 执行启动命令：
~~~shell
./start.sh
~~~
5. 停止Kubeaver：
~~~shell
./stop.sh
~~~

访问方式：
通过浏览器访问控制主机上的80端口，即可进入kubeaver管理页面。

  <div style="margin-top: 10px;">
    <a href="../host/manage" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>添加主机</strong>
    </a>
  </div>

  <div style="margin-top: 10px;">
    <a href="../offline/base" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>kubernetes离线包导入</strong>
    </a>
  </div>

