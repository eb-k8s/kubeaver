# Introduction

Since we do not have a file server, all offline packages for Kubeaver are stored within container images. We utilize GitHub Packages to host our offline packages. You will need to manually pull the image, start a container, and then use docker cp to extract the offline package files.

If your network permits, you can directly use our offline package generation script to generate the offline packages online: [Generate offline package](../offline_package/get_base.py)

# Offline package download

## Base package

The base package image is located at `ghcr.io/eb-k8s/kubeaver/kubeaver_offline`, where the image tag corresponds to the Kubernetes version. You can check which versions of the base package are available in Kubeaver's packages. For example, to pull the base package image for v1.27.10, use the following method:

```
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10
docker run -d ghcr.io/eb-k8s/kubeaver/kubeaver_offline:v1.27.10 --name kubeaver_offline 
# ！！！Note that when copying offline packages, the name of the offline package varies with the version.
docker cp kubeaver_offline:/root/base_k8s_v1.27.10.tgz .
```

## Extend package

### Operation System package

Currently, we support four operating systems: Ubuntu 22.04, CentOS 7, Rocky 9, and openEuler 22.03. The operating system extension packages are located at `ghcr.io/eb-k8s/kubeaver`. Unlike the base package, the image names for different OS dependency packages vary. The Ubuntu image is named `oslib_ubuntu`, while images for other operating systems follow a similar pattern: `oslib_{operation_system_name}`. Below is an example of how to retrieve the dependency package for CentOS:

```
docker pull ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0
docker run -d ghcr.io/eb-k8s/kubeaver/oslib_centos:v1.0 --name kubeaver_oslib
# ！！！Note that when copying operation system package, the name of the offline package varies with the operation system.
docker cp kubeaver_oslib:/root/extend_CentOS_7_Core.tgz .
```

### Network plugin package










