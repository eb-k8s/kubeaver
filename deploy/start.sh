#!/bin/bash
HOST_IP=$(hostname -I | awk '{print $1}')
HOST_NAME=$(hostname)

if [ -z "$HOST_IP" ]; then
  echo "无法获取主机IP地址"
  exit 1
fi

if [ -z "$HOST_NAME" ]; then
  echo "无法获取主机名"
  exit 1
fi

echo "获取到主机IP: $HOST_IP"
echo "获取到主机名: $HOST_NAME"

# 目标主机添加域名映射
if grep -q "^[^#]*store.e-byte.cn" /etc/hosts; then
    sudo sed -i "/^[^#]*store.e-byte.cn/c\\$HOST_IP store.e-byte.cn" /etc/hosts
else
    echo "$HOST_IP store.e-byte.cn" | sudo tee -a /etc/hosts > /dev/null
fi

if ! command -v docker &> /dev/null; then
    echo "Docker 未安装或未在 PATH 中找到。"
    exit 1
fi

# 修改所在主机docker配置以及重启docker

####需要完善，获取当前目录.tar进行load
docker load -i ./kubeaver-1.0.0.tar

HOST_IP=$HOST_IP HOST_NAME=$HOST_NAME docker compose up -d
