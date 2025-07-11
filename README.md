# Kubeaver

<img src="./docs/imgs/logo_without_k.svg" height="100px"  />


Kubeaver is a tool for quickly deploying high-availability Kubernetes (K8s) clusters, supporting **online(in progress) and offline** methods. The project is based on [kubespray](https://github.com/kubernetes-sigs/kubespray), leveraging Ansible to automate deployment tasks, and provides a user-friendly **graphical user interface**.

Advantages of Kubeaver:

* **Offline deployment capability**: It can deploy K8s clusters without internet access, completely isolating network dependencies. Users can download offline packages and import them into Kubeaver for one-click deployment.

* **Basic cluster management operations**: Use Kubeaver to deploy, upgrade, scale, or reset clusters.

* **customizable cluster configuration**: Choose custom components for your cluster, such as network plugins and applications, and configure advanced parameters.

* **Real-time task progress tracking**: View task stages and time statistics.

⚠️ Note: If you can access the internet but face issues downloading K8s-related images and files due to network problems, we strongly recommend using the offline mode for rapid K8s cluster deployment.

🚧 This project is currently in the development phase (in progress). If you have any ideas or suggestions for our project, please submit an issue, and we will respond promptly.

[简体中文](./docs/README_CN.md)

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

Download the corresponding version of the offline package based on the K8s cluster version you plan to install. 
Download the offline package:
```
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_oslib:v1.0
docker run -d ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10 --name kubeaver_offline 
docker run -d ghcr.io/eb-k8s/kubeaver/kubeaver_oslib:v1.0 --name kubeaver_oslib
docker cp kubeaver_offline:/root/base_k8s_v1.27.10.tgz .
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
```
You can then obtain the offline package `base_k8s_v1.27.10.tgz、extend_CentOS_7_Core.tgz` and import it into Kubeaver.

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