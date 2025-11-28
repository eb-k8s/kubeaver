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

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# 在脚本所在目录中查找镜像归档文件
TAR_FILE=$(ls -1 "$SCRIPT_DIR"/kubeaver-*.tar 2>/dev/null | head -n1)

if [ -z "$TAR_FILE" ]; then
  echo "错误：在 $SCRIPT_DIR 目录中未找到镜像归档文件 (kubeaver-*.tar)。"
  exit 1
fi

echo "从 $TAR_FILE 加载镜像..."
docker load -i "$TAR_FILE"

echo "启动服务..."
HOST_IP=$HOST_IP HOST_NAME=$HOST_NAME docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d