---
title: 应用商店
---

## 概述



<!-- ---
title: 应用商店
---
# 应用商店
## 概述

<div>
<div style="display: flex; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
  <button 
    @click="selectedCategories = []" 
    :style="{ color: selectedCategories.length === 0 ? 'blue' : 'inherit', borderColor: selectedCategories.length === 0 ? 'blue' : '#ccc' }" 
    style="margin-right: 20px;">
    全部
  </button>
  <div v-for="type in uniqueAppTypes" :key="type" style="margin-right: 20px;">
    <button 
      @click="selectedCategories = [type]" 
      :style="{ color: selectedCategories.includes(type) ? 'blue' : 'inherit', borderColor: selectedCategories.includes(type) ? 'blue' : '#ccc' }">
      {{ capitalize(type) }}
    </button>
  </div>
</div>
<a-row :gutter="16">
  <a-col v-for="app in filteredApplications(selectedCategories)" :key="app.name" :span="8">
    <a-card :title="app.name" :hoverable="true" style="margin-bottom: 20px; height: 160px;">
      <a-row align="middle">
        <a-col :span="8">
          <img :src="app.logo" :alt="`${app.name} Logo`" style="width: 80px; height: auto;">
        </a-col>
        <a-col :span="16">
          <a-form-item >
            <a-select
              :model-value="app.selectedVersion"
              @change="(version) => handleVersionChanged(app, version)"
              :style="{ width: '100%' }"
              placeholder="请选择版本"
            >
              <a-option v-for="version in app.versions" :key="version" :value="version">{{ version }}</a-option>
            </a-select>
          </a-form-item>
          <div style="display: flex; justify-content: flex-end;margin-bottom: 2px;margin-top: auto;">
            <a-button type="primary" @click="handleDownloadApp(app.name, app.selectedVersion)">
              下载
            </a-button>
          </div>
        </a-col>
      </a-row>
    </a-card>
  </a-col>
</a-row>
</div>




<script setup>
import { ref, computed } from 'vue'
const activeTab = ref('all');
const selectedCategories = ref([]);

const applications = ref([
  {
    name: 'nginx',
    logo: '../public/images/nginx.png',
    versions: ['0.1.0', '0.2.0', '1.0.0'],
    selectedVersion: '0.1.0',
    apptype: 'webserver',
    description: 'A Helm chart for Kubernetes。',
  },
  {
    name: 'mysql',
    logo: '../public/images/mysql.png',
    versions: ['8.0.36', '5.4.47'],
    selectedVersion: '8.0.36',
    apptype: 'database',
    description: 'A Helm chart for Kubernetes。',
  },
  {
    name: 'redis',
    logo: '../public/images/redis.png',
    versions: ['5.0.7'],
    selectedVersion: '5.0.7',
    apptype: 'database',
    description: 'A Helm chart for Kubernetes。',
  },
  {
    name: 'adminer',
    logo: '../public/images/adminer.png',
    versions: ['4.8.0'],
    selectedVersion: '4.8.0',
    apptype: 'database',
    description: 'A Helm chart for Kubernetes',
  },
  {
    name: 'nfs-provisioner',
    logo: '../public/images/nfs.png',
    versions: ['4.0.18'],
    selectedVersion: '4.0.18',
    apptype: 'sysapp',
    description: 'A Helm chart for Kubernetes',
  },
  {
    name: 'kube-prometheus-stack',
    logo: '../public/images/prometheus_logo.png',
    versions: ['43.0.0'],
    selectedVersion: '43.0.0',
    apptype: 'sysapp',
  },
]);

 // Array to hold selected categories

const filteredApplications = (categories) => {
  if (categories.length === 0) {
    return applications.value; // Return all applications if no category is selected
  }
  return applications.value.filter(app => categories.includes(app.apptype));
};

const handleTabChange = (key) => {
  console.log('Tab changed to:', key);
  activeTab.value = key;
};
const handleVersionChanged = (app, version) => {
  app.selectedVersion = version;
  console.log(`${app.name} version changed to:`, version);
};


const handleDownloadApp = (name, version) => {
  const a = document.createElement('a');
  a.href = `/repo/${name}-${version}.tgz`; // Adjust the path and file 
  a.download = `${name}-${version}.tgz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const uniqueAppTypes = computed(() => {
  const types = applications.value.map(app => app.apptype);
  return [...new Set(types)];
});

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);


</script>

<style>
button {
  border: 1px solid #ccc; /* Default border color */
  background-color: transparent; /* Ensure the background is transparent */
  padding: 5px 10px; /* Add some padding for better appearance */
  border-radius: 4px; /* Optional: Add rounded corners */
  color: blue; /* Default text color */
}

button.active {
  color: blue; /* Text color when active */
  border-color: blue; /* Border color when active */
}

button:hover {
  background-color: #e0e0e0; /* Optional: Change background on hover */
}
</style> -->