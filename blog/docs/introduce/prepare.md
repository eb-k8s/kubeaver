---
title: 环境要求
---
# 环境要求



控制主机（kubeaver所在主机）：
- 准备一台 Linux 主机，并确保其满足最低硬件要求：CPU > 2 核，内存 > 4 GB， 磁盘空间 > 40 GB。
- 您需要提前安装tar命令
- Docker版本20.10.0+以上，内置支持docker compose 命令。

目标主机（最低硬件要求）：
- 控制节点内存2GB
- 工作节点内存1GB
- 磁盘空闲空间20GB

## 准备工作
  
  首先检查控制主机是否有tar 和 docker命令，若无需下述步骤进行下载相应的安装包进行安装：


### 下载tar 包

<div style="margin-top: 30px">
  <a-popover trigger="hover" position="bottom">
    <a-button
      type="primary"
      shape="round"
      size="medium"
      :style="{ width: '120px', height: '40px' }"
    >
      <template #default>下载tar包</template>
    </a-button>
    <template #content>
      <div class="popover-download-list" style="min-width: 180px;">
        <div class="download-option">
          <a href="/offline/tar_centos.tgz" 
          download="tar_centos.tgz">下载 CentOS 版本</a>
        </div>
        <div class="download-option">
          <a href="/offline/tar_ubuntu.tgz" 
          download="tar_ubuntu.tgz">下载 Ubuntu 版本</a>
        </div>
        <div class="download-option">
          <a href="/offline/tar_rocky.tgz"
            download="tar_rocky.tgz">下载 Rocky 版本</a>
        </div>
        <div class="download-option">
          <a href="/offline/tar_openEuler.tgz" 
          download="tar_openEuler.tgz">下载 openEuler 版本</a>
        </div>
      </div>
    </template>
  </a-popover>
</div>

下载完之后，上传到相应的控制主机。执行以下命令(以centos为例)：

~~~ shell
tar xfvz tar_centos.tgz
rpm -ivh tar.rpm
~~~



### 下载docker

<div style="margin-top: 30px">
  <a-popover trigger="hover" position="bottom">
    <a-button
      type="primary"
      shape="round"
      size="medium"
      :style="{ width: '120px', height: '40px' }"
    >
      <template #default>下载docker</template>
    </a-button>
    <template #content>
      <div class="popover-download-list" style="min-width: 180px;">
        <div class="download-option">
          <a href="/offline/docker_centos.tgz" 
          download="docker_centos.tgz">下载 CentOS 版本</a>
        </div>
        <div class="download-option">
          <a href="/offline/docker_ubuntu.tgz" 
          download="docker_ubuntu.tgz">下载 Ubuntu 版本</a>
        </div>
        <div class="download-option">
          <a href="/offline/docker_rocky.tgz"
            download="docker_rocky.tgz">下载 Rocky 版本</a>
        </div>
        <div class="download-option">
          <a href="/offline/docker_openEuler.tgz" 
          download="docker_openEuler.tgz">下载 openEuler 版本</a>
        </div>
      </div>
    </template>
  </a-popover>
</div>

下载完成之后，将压缩包上传到控制主机，执行以下命令（以centos为例）：

~~~ shell
tar xfvz docker_centos.tgz
cd docker_centos
./setup-docker.sh
docker compose version
~~~






<style scoped>
/* 悬浮框整体背景和阴影 */
.popover-download-list {
  background: #f6fff9;
  border-radius: 12px;
  box-shadow: 0 4px 16px 0 #23c34322;
  padding: 10px 0;
}

/* 每个下载选项的样式 */
.download-option {
  border: 1px solid #e0f5e7;
  border-radius: 8px;
  margin: 10px 18px;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 1px 4px 0 #23c34311;
}

.download-option:last-child {
  margin-bottom: 10px;
}

.download-option a {
  display: block;
  padding: 12px 20px;
  color:rgb(15, 15, 16);
  font-weight: 500;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
  cursor: pointer;
  font-size: 15px;
  letter-spacing: 0.5px;
}

/* 悬停高亮 */
.download-option:hover,
.download-option:focus-within {
  border-color: #23C343;
  background: #eafff2;
  box-shadow: 0 0 0 2px #23C34333;
}

.download-option:hover a,
.download-option:focus-within a {
  color: #179a2e;
  background: transparent;
}
</style>
