FROM rockylinux:9.3 AS builder
##安装所需的工具和依赖
RUN yum -y install openssh-clients binutils findutils rsync
# 设置工作目录
WORKDIR /root
# 拷贝文件
COPY . /root

# 下载node包
ENV NODE_VERSION=18.17.0
RUN curl -O https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz && \
    tar xfvz node-v$NODE_VERSION-linux-x64.tar.gz -C /usr/local --strip-components=1 && \
    rm node-v$NODE_VERSION-linux-x64.tar.gz
##安装pyenv和python环境
# 更换rocky仓库源
RUN mv Rocky.repo /etc/yum.repos.d/Rocky.repo && yum clean all && yum makecache && rm Dockerfile

# 安装pyenv
RUN tar -xzf pyenv.tgz && mv pyenv ~/.pyenv && rm pyenv.tgz 
# 设置环境变量
ENV PATH=${PATH}:/root/.pyenv/bin:/root/.pyenv/shims

# 初始化 pyenv
RUN echo 'eval "$(pyenv init --path)"' >> /root/.bashrc \
    && echo 'eval "$(pyenv init -)"' >> /root/.bashrc
# 创建虚拟环境
RUN mkdir python_env && /root/.Python-3.10.12/bin/python3 -m venv /root/python_env/kubespray-2.26

# 移动requirements.txt
RUN mv requirements-2.26.txt /root/python_env/kubespray-2.26/bin/requirements.txt 

# 到特定虚拟环境中换源，安装依赖包
RUN cd /root/python_env/kubespray-2.26/bin && ./pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && ./pip3 install --no-cache-dir -r requirements.txt && rm -rf requirements.txt

# 开始裁剪
# 设置工作目录，裁剪Python包本体
WORKDIR /root/.Python-3.10.12

# 清除编译过程中产生的文件
RUN cd bin && strip python3.10
RUN cd lib && strip libpython3.10.a
RUN find ./lib -name "*.so" -exec strip {} \; && rm -rf ./lib/python3.10/test && rm -rf ./lib/python3.10/config-3.10-x86_64-linux-gnu && find ./lib/python3.10 -name "*.pyc" -delete && find ./lib/python3.10 -name "__pycache__" -type d -exec rm -r {} +

# 清除虚拟环境中编译产生的文件
RUN find /root/python_env/kubespray-2.26 -name "*.pyc" -delete && find /root/python_env/kubespray-2.26 -name "__pycache__" -type d -exec rm -r {} +

# 第二阶段：运行阶段
FROM rockylinux:9.3
# 设置工作目录
WORKDIR /root
RUN yum -y install openssh-clients rsync
# 从构建阶段复制所需文件
COPY --from=builder /root/ /root/
#COPY --from=builder /root/.pyenv /root/.pyenv
COPY --from=builder /usr/local /usr/local

ENV PATH=${PATH}:/root/.pyenv/bin:/root/.pyenv/shims

ENV PATH=$PATH:/root/backend/bin
# 修改默认的 Redis 配置以使用新的数据存储路径
# 创建 Redis 数据存储目录
RUN yum -y install redis
ENV REDIS_DATA_DIR=/root/backend/data/redis
RUN mkdir -p $REDIS_DATA_DIR && \
    chown -R redis:redis $REDIS_DATA_DIR
RUN sed -i "s|^dir .*|dir $REDIS_DATA_DIR|" /etc/redis/redis.conf

# 设置node环境
RUN echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc 

RUN source ~/.bashrc && \
    cd /root/.pyenv/versions && \
    ln -s /root/python_env/kubespray-2.26 kubespray-2.26

#执行kubespray 
RUN cd /root/backend/ansible/kubespray/v2.26.0 && \
    source ~/.bashrc && pyenv local kubespray-2.26

RUN source ~/.bashrc && pyenv rehash && pyenv global kubespray-2.26

# 设置回工作目录
WORKDIR /root

RUN chmod +x /root/start.sh

CMD ["/root/start.sh"]
