<div align="center">
  <h1><img src="./docs/imgs/logo_without_k.svg" height="100px"  />Kubeaver</h1>

  <a href="https://github.com/eb-k8s/kubeaver/releases"><img src="https://img.shields.io/github/v/release/eb-k8s/kubeaver" alt="Latest Release"></a>
</div>



Kubeaver is a tool for quickly deploying high-availability Kubernetes (K8s) clusters, supporting **online(in progress) and offline** methods. The project is based on [kubespray](https://github.com/kubernetes-sigs/kubespray), leveraging Ansible to automate deployment tasks, and provides a user-friendly **graphical user interface**.

Advantages of Kubeaver:

* **Offline deployment capability**: It can deploy K8s clusters without internet access, completely isolating network dependencies. Users can download offline packages and import them into Kubeaver for one-click deployment.

* **Basic cluster management operations**: Use Kubeaver to deploy, upgrade, scale, or reset clusters.

* **customizable cluster configuration**: Choose custom components for your cluster, such as network plugins and applications, and configure advanced parameters.

* **Real-time task progress tracking**: View task stages and time statistics.

⚠️ Note: If you can access the internet but face issues downloading K8s-related images and files due to network problems, we strongly recommend using the offline mode for rapid K8s cluster deployment.


文档语言：[简体中文](./docs/README_CN.md)

## Quick Start

### Install Docker and Docker Compose

Install Docker on the host where you want to install Kubeaver using the official Docker guide: [Install Docker Engine](https://docs.docker.com/engine/install). After installation, run the `docker compose version` command to ensure Docker Compose is correctly installed. If not, manually install Docker Compose.

### Deploy Kubeaver

Download Kubeaver code:
```
git clone https://github.com/eb-k8s/kubeaver.git
```

Start Kubeaver using Docker Compose:
```
# Switch to the directory containing the Docker Compose file
cd ./deploy
# Start Kubeaver
docker compose up -d
```

After this, Kubeaver will be successfully installed on your host. You can now access it via port 80.

### Offline Package Import

Before deploying a Kubernetes cluster, you need to import the base package and extension packages according to your requirements. The base package contains essential components required for K8s cluster deployment, including the basic Flannel network plugin. If you intend to use Calico, you will need to import the Calico extension package. It’s important to note that you must import the corresponding operating system extension package based on the OS of your target cluster nodes.

Below shows how to download the Kubernetes base package for version v1.27.10 and the extension package for CentOS 7 operating system:
```
# download base package
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10
docker run -d --name kubeaver_offline ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10  
docker cp kubeaver_offline:/root/base_k8s_v1.27.10.tgz .
docker rm -f kubeaver_offline    ##delete containerd
# download os package
docker pull ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
docker run -d --name kubeaver_oslib ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0 
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
docker rm -f kubeaver_oslib    ##delete containerd
```
You can then obtain the offline package `base_k8s_v1.27.10.tgz、extend_CentOS_7_Core.tgz` and import it into Kubeaver.

Click here to view more detailed offline package download methods: [Offline package download](./docs/offline_package.md)

### Deploy a K8s Cluster

1. Add the hosts where you want to deploy the K8s cluster in the **Host Management** section.
2. In the **Cluster Management** interface, create your cluster by selecting the cluster version, network plugin, and the hosts included in the cluster.
3. Click **Save**, then select the newly created cluster in the **Cluster Management** interface and click **Deploy** to start the deployment.
4. View the status and progress of tasks in the **Task Queue** or check running/completed tasks in the **Task History**.

### Feature Introduction

* Add Host  
* Create Cluster  
* Deploy Cluster  
* Cluster Management  
* Node Management  
* Offline Package Management  

## Supported Linux Distributions

- **Ubuntu** 22.04
- **CentOS** 7
- **Rocky Linux** 9
- **openEuler** 22.03

## Supported Components

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

## Requirements

- Control Plane
  - Memory: 2 GB
- Worker Node
  - Memory: 1 GB

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
