# Kubeaver

A graphical K8s cluster management tool for offline installation and maintenance, based on  [kubespray](https://github.com/kubernetes-sigs/kubespray) .

:construction: This project is currently work in progress.

## Getting started


## Supported Linux Distributions

- **Ubuntu** 22.04
- **CentOS** 7
- **Rocky Linux** 9

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

Hardware:
These limits are safeguarded by Kubespray. Actual requirements for your workload can differ. For a sizing guide go to the [Building Large Clusters](https://kubernetes.io/docs/setup/cluster-large/#size-of-master-and-master-components) guide.

- Control Plane
  - Memory: 2 GB
- Worker Node
  - Memory: 1 GB

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)