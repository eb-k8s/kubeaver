#!/bin/bash

# 自动获取主机IP地址
HOST_IP=$(hostname -I | awk '{print $1}')
HOST_NAME=$(hostname)

# 检查 Docker 是否正在运行
if ! command -v docker &> /dev/null; then
    echo "Docker 未安装或未在 PATH 中找到。"
    exit 1
fi

# 提示用户确认
#read -p "确定要停止所有服务并清理环境吗？(y/n): " confirm
#if [[ $confirm != "y" ]]; then
#    echo "操作已取消。"
#    exit 0
#fi

# 尝试停止服务
if HOST_IP=$HOST_IP HOST_NAME=$HOST_NAME docker compose down; then
    echo "所有服务已成功停止。"
else
    echo "停止服务时出错。"
    exit 1
fi

# 清理不再需要的镜像（可选）
#echo "正在清理不再需要的镜像..."
#docker rmi kubeaver:v0.1.0 kubeadmin:v0.2.0 ghcr.io/helm/chartmuseum:v0.16.2 registry:2 apploader:latest nginx:alpine

#echo "环境清理完成。"
