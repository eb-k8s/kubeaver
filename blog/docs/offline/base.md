---
title: 基础包功能
---
# 基础包功能
## 概述

k8s基础包主要包括k8s组件（coredns、etcd、kube-apiserver、kube-controller-manager、kube-proxy和kube-scheduler）、网络插件flannelv0.22.0和metrics-server。涉及到的工具软件有net-tools、nmap、tcpdump、sysstat和iotop。


### 离线包架构

[![离线包架构图](/images/offlinefw.png)](/images/offlinefw.png)

### 基础包下载

<center>
    <div style="display: flex;margin-top: 30px">
      <a-form-item field="k8sVersion" style="margin-left: 10px;">
        <template #label>
          <strong>基础版本</strong>
        </template>
        <img :src="k8sLogoImg" alt="Logo" style="width: 40px; height: 40px; margin-right: 10px;">
        <a-select
          :model-value="k8sVersion"
          @change="handleChanged"
          :style="{ width: '170px', height: '40px' }"
          placeholder="请选择版本"
        >
        <a-option v-for="version in k8sVersions" :key="version" :value="version">
          <div style="display: flex; align-items: center;">
            <img :src="`/images/kubernetes-${version.substring(0,5)}.png`" alt="Logo" style="width: 18px; height: 18px; margin-right: 8px;">
            <span>{{ version }}</span>
          </div>
        </a-option>
        </a-select>
      </a-form-item>
    <a-button type="primary" shape="round" size="medium" :style="{ width: '80px',height: '40px',left: '-300px'}" @click="handleDownload(k8sVersion)">
      <template #icon>
        <icon-download />
      </template>
      <template #default>下载</template>
    </a-button>
    </div>
</center>

### 操作系统包下载

初次部署必须选择与主机匹配的操作系统进行下载。

<center>
      <div style="display: flex; margin-top: 30px">
        <a-form-item field="extendRelease" style="margin-left: 10px;">
        <template #label>
          <strong>操作系统</strong>
        </template>
          <a-select
            :model-value="extendRelease"
            @change="handleExtendReleaseChanged"
            :style="{ width: '170px', height: '40px' }"
            placeholder="请选择版本"
          >
          <a-option v-for="(actualValue, displayValue) in linuxReleaseMapping" :key="displayValue" :value="displayValue">
          {{ displayValue }}
          </a-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" shape="round" size="medium" :style="{ width: '80px', height: '40px',left: '-330px' }" @click="handleDownloadExtendRelease(extendRelease)">
          <template #icon>
            <icon-download />
          </template>
          <template #default>下载</template>
        </a-button>
      </div>
</center>

<script setup>
import { ref, computed } from 'vue'
const extendRelease = ref("openEuler_22.03");
const k8sVersion = ref("v1.25.16");

const k8sVersions = ref([
  "v1.25.16",
  "v1.26.13",
  "v1.27.10",
  "v1.28.12",
  "v1.29.7",
  "v1.30.4",
  ]);

const linuxReleaseMapping = {
  "openEuler_22.03": "openEuler_22.03_LTS-SP4",
  "Rocky_9.5": "Rocky_9.5_Blue_Onyx",
  "Ubuntu_22.04.5": "Ubuntu_22.04.5_LTS",
  "CentOS_7": "CentOS_7_Core",
};

const k8sLogoImg = computed(() => {
  return `/images/kubernetes-${k8sVersion.value.substring(0,5)}.png`;
});

const handleK8sVersionChanged = async (version) => {
  k8sVersion.value = version;
  //k8sLogoImg.value = `images/kubernetes-${version.substring(0,4)}.png`
  // console.log(k8sLogoImg.value);
}

const handleDownload = async (version) => {
  console.log(version)
  var a = document.createElement('a');
  a.href = `/offline/base_k8s_${version}.tgz`; // Change this to the path of your file
  a.download = `base_k8s_${version}.tgz`; // You can set this to a default filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


const handleChanged = async (version) => {
  k8sVersion.value = version;
}

const handleExtendReleaseChanged = async (release) => {
  // Use the mapping to get the actual value
  extendRelease.value = release;
  console.log(extendRelease.value);
}

const handleDownloadExtendRelease = async (release) => {
  const actualRelease = linuxReleaseMapping[release] || release;
  var a = document.createElement('a');
  a.href = `/offline/extend_${actualRelease}.tgz`; // Adjust the path as needed
  a.download = `extend_${actualRelease}.tgz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}




</script>