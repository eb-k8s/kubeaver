---
title: kubeaver扩展功能
---
# kubeaver扩展功能
## 概述

kubeaver离线包默认只支持三个版本k8s，比如kubeaver1.0.0版本支持k8s 1.25-1.27版本，若想同时也支持k8s 1.28-1.30版本，这就需要扩展，具体操作如下：

1. 下载kubeaver后端扩展包

~~~shell
docker pull ghcr.io/eb-k8s/kubeaver/kubeaver_backend:v1.0.0-128
~~~

2. 配置docker compose

停掉服务（确保kubeaver平台没有任务在执行），执行

  ~~~shell
  docker compose down
  ~~~

在 <span style="color: blue;" >docker-compose.yml</span> 文件中添加如下内容：

  ~~~yml
    kubeaver_backend_v1-128: ##服务名（与nginx-conf中名称一致）
      image: ghcr.io/dbsave/kubeaver_backend:v1.0.0-128 ###上面导入的镜像名称
      container_name: kubeaver_backend_v1-128 ##容器名称
      restart: always
      environment:
        - HOST_IP=${HOST_IP}
        - HOST_NAME=${HOST_NAME}  
        - REDIS_HOST=redis
        - REDIS_PORT=6379      
      volumes:
        - ./data/kubeaver/offline:/root/backend/data/offline
        - ./data/kubeaver/redis:/root/backend/data/redis
        - ./data/kubeaver/inventory:/root/backend/data/inventory
        - ./data/kubeaver/config:/root/backend/data/config
        - ./data/kubeadmin:/root/backend/data/kubeadmin
      depends_on:
        redis:
          condition: service_started
  ~~~

在 <span style="color: blue;" >nginx-proxy.conf</span> 文件中添加如下内容：

  ~~~yml
        location /v128/api/ {   ##/v128取决于镜像tag中v1.0.0-128
              add_header X-Proxy-Target "kubeaver_backend_v1-128"; ##修改
              proxy_pass http://kubeaver_backend_v1-128:8000/api/; ##修改
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
          }
          location /v128/ws/ {   ##也要增加ws转发
              proxy_pass http://kubeaver_backend_v1-128:8000/;  ##修改
              proxy_set_header   X-Forwarded-Proto $scheme;
              proxy_set_header   X-Real-IP         $remote_addr;
              proxy_set_header Host $host;
              proxy_http_version 1.1;
              proxy_set_header Upgrade $http_upgrade;
              proxy_set_header Connection "upgrade";
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_read_timeout 4h;
              proxy_send_timeout 4h;
          }
  ~~~

3. 启动kubeaver服务

    ~~~shell
    docker compose up -d
    ~~~ 

4. kubeaver服务启动成功之后，要导入k8s v1.28-1.30基础包才能进行部署相应版本k8s。注意，如果想部署calico，k8s v1.28-1.30版本下载calico-v3.26.1。

