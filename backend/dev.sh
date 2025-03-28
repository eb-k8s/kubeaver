#!/bin/bash

# 设置要下载的 Kubespray 版本
KUBESPRAY_VERSION=$1

# 设置下载和解压的目录
DOWNLOAD_DIR="./ansible"
KUBESPRAY_ZIP="${DOWNLOAD_DIR}/kubespray.zip"

# 创建下载目录（如果不存在）
mkdir -p $DOWNLOAD_DIR

# 下载指定版本的 Kubespray
wget -O ./ansible/${KUBESPRAY_VERSION}.zip "https://github.com/kubernetes-sigs/kubespray/archive/refs/tags/${KUBESPRAY_VERSION}.zip"

# 检查 wget 命令是否成功
if [ $? -eq 0 ]; then
    echo "Download successful."
    cd ${DOWNLOAD_DIR}
    unzip ${KUBESPRAY_VERSION}.zip

    VERSION_WITHOUT_V=$(echo $KUBESPRAY_VERSION | sed 's/^v//')
    # 检查解压后的目录是否存在
    if [ -d "kubespray-${VERSION_WITHOUT_V}" ]; then
        mv "kubespray-${VERSION_WITHOUT_V}" "kubespray" || { echo "Failed to rename directory"; exit 1; }
    else
        echo "Error: Directory kubespray-${VERSION_WITHOUT_V} not found!"
        ls -l  # 显示当前目录内容以便调试
        exit 1
    fi

    # 执行 kubespray_process.py 脚本
    python3 kubespray_process.py --kubespray_version=$KUBESPRAY_VERSION

    ##启动docker-compose服务，该服务只启动一次
    cd ../
    if ! docker-compose -f ./docker-compose.yml ps | grep -q "Up"; then
        echo "Starting Docker Compose services..."
        docker-compose -f ./docker-compose.yml up -d
    else
        echo "Docker Compose services are already running."
    fi
else
    echo "Download failed, exiting script."
    exit 1
fi
