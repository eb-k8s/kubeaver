---
title: 快速开始
---
# 快速开始

本指南介绍如何在离线环境下快速搭建kubeaver平台。

Kubeaver平台是一个在离线环境下可快速管理kubernetes集群的一款工具。该平台开箱即用，提供可视化界面，让用户一键导入离线包并快速部署高可用Kubernetes (K8s) 集群。目前适用于amd64架构，支持操作系统CentOS 7、Ubuntu 22.04、Rocky Linux 9和openEuler 22.03。


### 环境准备

- 
  <div style="margin-top: 10px;">
    <a href="../introduce/prepare" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>主机要求</strong>
    </a>
  </div>
- 
  <div style="margin-top: 10px;">
    <a href="../introduce/prepare" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>docker compose命令</strong>
    </a>
  </div>
- 
  <div style="margin-top: 10px;">
    <a href="../introduce/prepare" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>tar命令</strong>
    </a>
  </div>

### 部署kubeaver

下载kubeaver代码：
~~~shell
git clone https://github.com/eb-k8s/kubeaver.git
~~~

使用Docker Compose启动Kubeaver：
~~~shell
# 切换到Docker Compose文件所在目录
cd ./deploy
# 启动Kubeaver
./start.sh

# 停止Kubeaver
./stop.sh 
~~~

<!-- ### 下载Kubeaver软件包

在控制主机下载软件包：
  <div style="display: flex; align-items: flex-start;margin-top: 10px;">
    <div style="display: flex; flex-direction: column; align-items: flex-start;">
      <a-form-item field="name" label="版本" style="margin: 0;">
        <a-select
          :model-value="k8sbeaverVersion"
          @change="handleChanged"
          :style="{ width: '120px', height: '40px' }"
          placeholder="请选择版本"
        >
          <a-option v-for="version in kubeaverVersions" :key="version.version" :value="version.version">
            {{ version.version }}
          </a-option>
        </a-select>
      </a-form-item>
      <p style="margin-top: 5px; max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <strong>说明：</strong>{{ currentDescription }}
      </p>
    </div>
    <a-button type="primary" shape="round" size="medium" :style="{ width: '80px',height: '40px',left: '-70px'}" @click="handleKubeaverDownload(k8sbeaverVersion)">
      <template #icon>
        <icon-download />
      </template>
      <template #default>下载</template>
    </a-button>
  </div>
  <div style="margin-top: 10px;">
    <a href="/deploy/extend" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>扩展说明</strong>
    </a>
  </div>

### 部署说明

解压(以1.0.0为例)：
~~~shell
tar xfvz kubeaver-1.0.0.tgz
~~~

执行启动命令：
~~~shell
cd kubeaver-1.0.0
./start.sh
~~~ -->

访问方式：
通过浏览器访问控制主机上的80端口，即可进入kubeaver管理页面。

  <div style="margin-top: 10px;">
    <a href="../offline/base" style="color: #3491FA; font-size: 16px; text-decoration: none;">
      <strong>kubernetes离线包导入</strong>
    </a>
  </div>

<script setup>
import { ref, computed } from 'vue'
const k8sbeaverVersion = ref("1.0.0");


const currentDescription = computed(() => {
  const versionObj = kubeaverVersions.value.find(v => v.version === k8sbeaverVersion.value);
  return versionObj ? versionObj.description : '';
});

const kubeaverVersions = ref([
  { 
    version: "1.0.0", 
    description: "基础包支持集群版本1.25.x-1.27.x" 
  },
]);

const handleKubeaverDownload = async (version) => {
  var a = document.createElement('a');
  a.href = `/kubeaver/kubeaver-${version}.tgz`; // Change this to the path of your file
  a.download = `kubeaver-${version}.tgz`; // You can set this to a default filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

</script>