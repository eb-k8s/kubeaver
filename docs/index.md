---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Kubeaver"
  text: "一款强大的Kubernetes集群部署工具"
  tagline: 支持全离线环境下一键部署高可用Kubernetes 集群。
  actions: 
    - theme: brand
      text: 快速开始
      link: /deploy/start.md
    - theme: alt
      text: Github
      link: https://github.com/eb-k8s/kubeaver
  image:
    src: /images/kubeaver.png

features:
  - icon: ⚡
    title: 开箱即用
    details: 无需复杂配置，一键自动完成高可用 Kubernetes 集群的部署，支持离线环境，大幅降低运维门槛。
  - icon: ✅
    title: 离线部署
    details: 支持全离线环境下的Kubernetes集群部署方案，用户可根据实际需求下载定制化离线安装包，并导入至Kubeaver平台，实现一键式快速部署。
  - icon: 👉
    title: 灵活扩展
    details: 提供了极大的灵活性和兼容性保障，尤其适合混合环境、渐进式升级和多团队协作的场景。

---

<center>

<!-- <div style="padding: 10px; display: inline-block;">
  <video src="./kubeaver.mp4" controls="controls" autoplay></video>
</div> -->

</center>

## 系统架构

<center>
<div style="padding: 10px; display: inline-block;">
  <img src="/images/design.png" style="width: 1050px; display: block; margin: 0 auto 10px;">
</div>
</center>

## 主要功能

<div class="tech-feature-cards">
  <!-- 卡片1 -->
  <div class="tech-card">
    <div class="tech-card-header">
      <img src="/images/rich.svg" alt="Logo" class="tech-card-logo">
      <h3>Kubernetes 集群管理</h3>
    </div>
    <div class="tech-content">
      <p>简化运维、提升效率、保障稳定性，支持高可用集群部署</p>
      <a href="/cluster/manage" class="tech-link">了解更多 →</a>
    </div>
  </div>

  <!-- 卡片2 -->
  <div class="tech-card">
    <div class="tech-card-header">
      <img src="/images/cluster.svg" alt="Logo" class="tech-card-logo">
      <h3>安装 Kubernetes 集群</h3>
    </div>
    <div class="tech-content">
      <p>兼容多种操作系统部署 Kubernetes，提供离线安装，支持一键升级与扩容集群</p>
      <a href="/deploy/start" class="tech-link">了解更多 →</a>
    </div>
  </div>

  <div class="tech-card">
    <div class="tech-card-header">
      <img src="/images/offline.svg" alt="Logo" class="tech-card-logo">
      <h3>离线包管理</h3>
    </div>
    <div class="tech-content">
      <p>提供各种Kubernetes离线包、网络插件包、操作系统包和应用包管理</p>
      <a href="/offline/base" class="tech-link">了解更多 →</a>
    </div>
  </div>
</div>


<div style="background-color: #f7fbff; padding: 20px 0; width: 100vw; box-sizing: border-box; position: relative; left: 50%; transform: translateX(-50%);margin-bottom: 40px !important; display: block;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
  <h1 style="text-align: center;">使用说明</h1>
    <div style="background-color: #E8F7FF; padding: 20px; box-shadow: none; position: relative; display: flex; gap: 20px;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h2 style="border-top: none; margin: 0;">环境准备</h2> <!-- Positioned below the image and number -->
      </div>
      <div style="flex: 1; display: flex;">
        <a-card title="要求" style="height: 270px; width: 358px">
          <div><strong>控制主机：</strong></div>
          <li>Docker版本20.10.0+以上，内置支持docker compose 命令。<strong><span style="color: #23C343;">若无Docker，右侧下载。</span></strong></li>
          <div><strong>目标主机：</strong></div>
          <li>控制节点内存2GB。</li>
          <li>工作节点内存1GB。</li>
          <li>磁盘空闲空间20GB。</li>
        </a-card>
      </div>
      <div style="flex: 1; display: flex;">
        <a-card title="下载" style="height: 270px; width: 358px">
        <a-popover trigger="hover" position="bottom">
          <a-button
            type="primary"
            shape="round"
            size="medium"
            :style="{ width: '120px', height: '40px' }"
          >
            <template #default>下载Docker</template>
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
        <div style="margin-top: 10px;"><strong>操作步骤(以CentOS为例)：</strong></div>
        <li>解压tar -cvzf docker_centos.tgz </li>
        <li>执行./setup-docker.sh </li>
        <li>验证docker compose version</li>
        </a-card>
      </div>
    </div>
    <div style="background-color: #FCFFE8; padding: 20px; box-shadow: none; position: relative; display: flex; gap: 20px;">
      <!-- Left side: 部署kubeaver -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h2 style="border-top: none; margin: 0;">部署Kubeaver</h2> <!-- Positioned below the image and number -->
      </div>
      <!-- Middle: 软件包下载 -->
      <div style="flex: 1; display: flex;">
      <a-card title="下载" style="height: 240px; width: 358px">
        <div style="display: flex; align-items: flex-start;">
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <a-form-item field="name" label="版本" style="margin: 0;">
              <a-select
                :model-value="k8sbeaverVersion"
                @change="handleChanged"
                :style="{ width: '110px', height: '40px' }"
                placeholder="请选择版本"
              >
                <a-option v-for="version in kubeaverVersions" :key="version.version" :value="version.version">
                  {{ version.version }}
                </a-option>
              </a-select>
            </a-form-item>
            <p style="margin-top: 5px; max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <strong>版本说明：</strong>{{ currentDescription }}
            </p>
          </div>
          <a-button type="primary" shape="round" size="medium" :style="{ width: '80px',height: '40px',left: '-80px'}" @click="handleKubeaverDownload(k8sbeaverVersion)">
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
      </a-card>
      </div>
      <!-- Right side: 运行kubeaver -->
      <div style="flex: 1;">
        <a-card title="运行" style="height: 240px; width: 358px;">
        <div><strong>在控制主机上执行:</strong></div>
        tar xfvz kubeaver-1.0.0.tgz <br>
        cd kubeaver-1.0.0 <br>
        ./start.sh
        <div><strong>访问：</strong>通过浏览器访问目标主机上的8080端口，即可进入Kubeaver管理页面。
        </div>
        </a-card>
      </div>
    </div>
      <div style="background-color: #E8FFEA; padding: 20px; box-shadow: none; position: relative; display: flex; gap: 20px;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h2 style="border-top: none; margin: 0;">离线包导入</h2> <!-- Positioned below the image and number -->
      </div>
      <div style="flex: 1; display: flex;">
      <a-card title="下载" style="height: 300px; width: 358px">
      <div style="display: flex; align-items: center; gap: 10px;">
        <a-form-item field="k8sVersion" label="Kubernetes" style="margin: 0;">
          <a-select
            :model-value="k8sVersion"
            @change="handleK8sVersionChanged"
            :style="{ width: '120px', height: '40px' }"
            placeholder="请选择版本"
          >
            <a-option v-for="version in k8sVersions" :key="version" :value="version">
              {{ version }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" shape="round" size="medium" :style="{ width: '80px', height: '40px',left: '0px' }" @click="handleDownload(k8sVersion)">
          <template #icon>
            <icon-download />
          </template>
          <template #default>下载</template>
        </a-button>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <a-form-item field="extendRelease" label="操作系统" style="margin: 0; margin-top: 10px;">
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
        <a-button type="primary" shape="round" size="medium" :style="{ width: '80px', height: '40px',left: '0px' }" @click="handleDownloadExtendRelease(extendRelease)">
          <template #icon>
            <icon-download />
          </template>
          <template #default>下载</template>
        </a-button>
      </div>
      <div><strong>说明：</strong><span style="color:rgb(195, 35, 35);">初次使用可先导入k8s基础包（基础包中包含k8s基础软件、flannel和metrics。再选择一个操作系统包导入即可。</span>
      </div>
        <div style="margin-top: 10px;">
          <a href="/offline/extend" style="color: #3491FA; font-size: 16px; text-decoration: none;">
            <strong>扩展说明</strong>
          </a>
        </div>
      </a-card>
      </div>
      <div style="flex: 1; display: flex;">
      <a-card title="导入" style="height: 300px; width: 358px;" >
      <div>可通过Kubeaver网站👉离线包管理👉离线包上传👉账号admin 密码admin 👉 文件目录offline👉右上角上传</div>
      <p style="margin: 5px 0;"><strong>注意：</strong></p>
      <div style="margin: 5px 0;">1. 先导入Kubernetes基础包</div>
      <div style="margin: 5px 0;">2. 再选择操作系统包导入</div>
      <div style="margin: 5px 0;">3. 扩展包根据扩展包说明下载导入</div>
      </a-card>
      </div>
    </div>
    <div style="background-color: #E8F7FF; padding: 20px; box-shadow: none; position: relative; display: flex; gap: 20px;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h2 style="border-top: none; margin: 0;">部署K8s集群</h2> <!-- Positioned below the image and number -->
      </div>
      <div style="flex: 1; display: flex;">
        <a-card title="部署" style="height: 250px; width: 358px">
          <ol>
            <li>添加主机</li>
            <li>创建集群群组</li>
            <li>部署集群</li>
          </ol>
        </a-card>
      </div>
      <div style="flex: 1; display: flex;">
        <a-card title="管理" style="height: 250px; width: 358px">
          <ol>
            <li>集群管理</li>
            <li>节点管理</li>
            <li>离线包管理</li>
          </ol>
        </a-card>
      </div>
    </div>
</div>
</div>

<!-- 新增的 KubeSphere 内容 -->
<div style="background-color: white; padding: 20px 0; width: 100vw; box-sizing: border-box; position: relative; left: 50%; transform: translateX(-50%); margin-bottom: 40px;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h1 style="text-align: center;">应用管理-容器云平台</h1>
    <div style="display: flex; justify-content: center; margin-bottom: 30px;">
      <!-- <img src="/images/k8s.png" alt="KubeSphere Logo" style="height: 80px;"> -->
    </div>  
    <p style="text-align: center; font-size: 1.1rem; margin-bottom: 30px;">
      <a href="/app/kubeadmin" style="color: #3491FA; text-decoration: none;">
        Kubeadmin
      </a> 是在 Kubernetes 之上构建的以应用为中心的容器平台，提供了运维友好的向导式操作界面,帮助用户快速部署应用的平台。
    </p>
    <div class="kubesphere-features" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 80px; height: 80px; margin-bottom: 15px; background-color: #f0f9ff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <img src="/images/manage.svg" alt="开源图标" style="width: 50px; height: 50px;">
          </div>
          <h3 style="color: black; margin: 0; text-align: center;">应用管理</h3>
        </div>
        <p style="text-align: center;">统一控制台管理应用状态、日志、监控。</p>
      </div>    
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <a href="/app/deploy" style="text-decoration: none; color: inherit;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 80px; height: 80px; margin-bottom: 15px; background-color: #f0f9ff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <img src="/images/easy-to-run.svg" alt="开源图标" style="width: 50px; height: 50px;">
            </div>
            <h3 style="color: black; margin: 0; text-align: center;">应用部署</h3>
          </div>
          <p style="text-align: center;">支持支持一键部署、升级应用。</p>
        </a>
      </div>    
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <a href="/app/store" style="text-decoration: none; color: inherit;">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 80px; height: 80px; margin-bottom: 15px; background-color: #f0f9ff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <img src="/images/store.svg" alt="开源图标" style="width: 50px; height: 50px;">
          </div>
          <h3 style="color: black; margin: 0; text-align: center;">应用商店</h3>
        </div>
        <p>提供基于 Helm 的应用商店与应用仓库，内置多个应用模板，支持应用生命周期管理。</p>
       </a>
      </div>  
    </div>
  </div>
</div>

<script setup>
import { ref, computed } from 'vue'
const k8sVersion = ref("v1.25.16");
const extendRelease = ref("openEuler_22.03");
// const k8sLogoImg = ref("images/kubernetes-1.25.png");
const k8sbeaverVersion = ref("1.0.0");

const copyCodeBlock = ref(null);

const copyRunCode = () => {
  // 读取 code 标签内容
  const code = copyCodeBlock.value?.innerText || '';
  if (!code) return;
  // 复制到剪贴板
  navigator.clipboard.writeText(code).then(() => {
    // 可选：提示复制成功
  });
};

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

  
const handleK8sVersionChanged = async (version) => {
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
//k8s-v1.27.10_Rocky-Linux_9.1_Blue-Onyx_amd64.tgz
const handleDownload = async (version) => {
  console.log(version)
  var a = document.createElement('a');
  a.href = `/offline/base_k8s_${version}.tgz`; // Change this to the path of your file
  a.download = `base_k8s_${version}.tgz`; // You can set this to a default filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const kubeaverVersions = ref([
  { 
    version: "1.0.0", 
    description: "支持集群版本1.25.x-1.27.x" 
  },
]);

const currentDescription = computed(() => {
  const versionObj = kubeaverVersions.value.find(v => v.version === k8sbeaverVersion.value);
  return versionObj ? versionObj.description : '';
});

const handleKubeaverDownload = async (version) => {
  var a = document.createElement('a');
  a.href = `/kubeaver/kubeaver-${version}.tgz`; // Change this to the path of your file
  a.download = `kubeaver-${version}.tgz`; // You can set this to a default filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


const handleChanged = async (version) => {
  k8sbeaverVersion.value = version;
}

const handleChangedBackend = async (version) => {
  console.log(version)
  backendVersion.value = version;
}

</script>
<style scoped>
.card-demo {
  width: 360px;
  margin-left: 24px;
  transition-property: all;
}
.highlight {
  color: #3491FA; /* 你想要的颜色 */
}
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

.tech-feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin: 2rem 0;
}

.tech-card {
  border: 2px solid #f0f0f0; /* Added 'solid' for the border style */
  border-radius: 8px;
  padding: 24px;
  transition: all 0.3s ease;
  background: white;
}

.tech-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  border-color: #3491fa33;
}

.tech-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.tech-content p {
  color: #666;
  line-height: 1.7;
  margin-bottom: 20px;
  font-size: 0.95rem;
}

.tech-link {
  display: inline-flex;
  align-items: center;
  color: #23C343;
  font-weight: 800;
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tech-link:hover {
  text-decoration: underline;
  color: #1a73e8;
}

.tech-link::after {
  content: "→";
  margin-left: 5px;
  transition: transform 0.2s;
}

.tech-link:hover::after {
  transform: translateX(3px);
}

@media (max-width: 768px) {
  .tech-feature-cards {
    grid-template-columns: 1fr;
  }
  
  .tech-card {
    padding: 18px;
  }
}

.tech-card-header {
  display: flex;
  align-items: center;
}

.tech-card-logo {
  width: 40px; /* Adjust the size as needed */
  height: 40px; /* Adjust the size as needed */
  margin-right: 10px; /* Space between the logo and the title */
}


</style>
