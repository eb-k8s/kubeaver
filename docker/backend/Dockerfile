FROM rockylinux:9.3 AS builder
ARG KUBESPRAY_VERSION

# Use the build-time variable
ENV KUBESPRAY_VERSION=${KUBESPRAY_VERSION}

##安装所需的工具和依赖
RUN yum -y install openssh-clients binutils findutils rsync git
# 设置工作目录
WORKDIR /root
# 拷贝文件
COPY . /root

#下载node包
ENV NODE_VERSION=18.17.0
RUN curl -O https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz && \
    tar xfvz node-v$NODE_VERSION-linux-x64.tar.gz -C /usr/local --strip-components=1 && \
    rm node-v$NODE_VERSION-linux-x64.tar.gz
##安装pyenv和python环境
# 更换rocky仓库源
#RUN mv Rocky.repo /etc/yum.repos.d/Rocky.repo && yum clean all && yum makecache && rm Dockerfile

# 安装pyenv
RUN curl https://pyenv.run | bash
#RUN tar -xzf pyenv.tgz && mv pyenv ~/.pyenv && rm pyenv.tgz 
# 设置环境变量
ENV PATH=${PATH}:/root/.pyenv/bin:/root/.pyenv/shims

# 初始化 pyenv
RUN echo 'eval "$(pyenv init --path)"' >> /root/.bashrc \
    && echo 'eval "$(pyenv init -)"' >> /root/.bashrc
# 创建虚拟环境

ARG PYTHON_VERSION=3.10.12
# 安装编译python所需依赖
RUN yum groupinstall "Development tools" -y
RUN dnf install -y gcc zlib-devel bzip2 bzip2-devel readline-devel sqlite sqlite-devel openssl-devel tk-devel libffi-devel xz-devel git

# 安装对应版本python
RUN curl -O https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz && \
    tar -xf Python-${PYTHON_VERSION}.tgz -C /tmp && rm Python-${PYTHON_VERSION}.tgz && mkdir -p ~/.pyenv/versions 
RUN cd /tmp/Python-${PYTHON_VERSION} && ./configure --prefix=/root/.Python-3.10.12 && make && make install

RUN mkdir python_env && /root/.Python-3.10.12/bin/python3 -m venv /root/python_env/kubespray-${KUBESPRAY_VERSION}
# 移动requirements.txt
RUN mv requirements-${KUBESPRAY_VERSION}.txt /root/python_env/kubespray-${KUBESPRAY_VERSION}/bin/requirements.txt 

# 到特定虚拟环境中换源，安装依赖包
RUN cd /root/python_env/kubespray-${KUBESPRAY_VERSION}/bin && ./pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && ./pip3 install --no-cache-dir -r requirements.txt && rm -rf requirements.txt

# 开始裁剪
# 设置工作目录，裁剪Python包本体
WORKDIR /root/.Python-3.10.12

# 清除编译过程中产生的文件
RUN cd bin && strip python3.10
RUN cd lib && strip libpython3.10.a
RUN find ./lib -name "*.so" -exec strip {} \; && rm -rf ./lib/python3.10/test && rm -rf ./lib/python3.10/config-3.10-x86_64-linux-gnu && find ./lib/python3.10 -name "*.pyc" -delete && find ./lib/python3.10 -name "__pycache__" -type d -exec rm -r {} +

# 清除虚拟环境中编译产生的文件
RUN find /root/python_env/kubespray-${KUBESPRAY_VERSION} -name "*.pyc" -delete && find /root/python_env/kubespray-${KUBESPRAY_VERSION} -name "__pycache__" -type d -exec rm -r {} +

# 第二阶段：运行阶段
FROM rockylinux:9.3
ARG KUBESPRAY_VERSION

# Use the build-time variable
ENV KUBESPRAY_VERSION=${KUBESPRAY_VERSION}
# 设置工作目录
WORKDIR /root
RUN yum -y install openssh-clients rsync iputils
# 从构建阶段复制所需文件
COPY --from=builder /root/ /root/
#COPY --from=builder /root/.pyenv /root/.pyenv
COPY --from=builder /usr/local /usr/local

ENV PATH=${PATH}:/root/.pyenv/bin:/root/.pyenv/shims

ENV PATH=$PATH:/root/backend/bin

# 设置node环境
RUN echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc 

RUN source ~/.bashrc && \
    cd /root/.pyenv/versions && \
    ln -s /root/python_env/kubespray-${KUBESPRAY_VERSION} kubespray-${KUBESPRAY_VERSION}

#执行kubespray 
RUN cd /root/backend/ansible/kubespray&& \
    source ~/.bashrc && pyenv local kubespray-${KUBESPRAY_VERSION}

RUN source ~/.bashrc && pyenv rehash && pyenv global kubespray-${KUBESPRAY_VERSION}

# 设置回工作目录
WORKDIR /root
# 创建 .ssh 目录并设置权限（解决 ssh-copy-id 临时目录问题）
RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

RUN cp /root/backend/ansible/kubespray/ansible.cfg /root/.ansible.cfg
RUN chmod 600 /root/backend/ssh/id_rsa

CMD ["node", "/root/backend/app.js"]
