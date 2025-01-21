<template>
  <div class="container">
    <a-breadcrumb :style="{ fontSize: '14px', marginTop: '16px', marginBottom: '16px' }">
      <a-breadcrumb-item>离线包管理</a-breadcrumb-item>
      <a-breadcrumb-item>离线包详情</a-breadcrumb-item>
    </a-breadcrumb>

    <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 16px;">
      <a-card title="基本信息" style="flex: 0.8;">
        <a-descriptions :column="1" class="descriptions-container">
          <!--<a-descriptions-item label="离线包版本">{{ kubesprayVersion }}</a-descriptions-item>-->
          <a-descriptions-item label="操作系统">
            <template v-if="supportedOs.length">
              <div v-for="(os, index) in supportedOs" :key="index">{{ os }}</div>
            </template>
          </a-descriptions-item>
          <a-descriptions-item label="架构">{{ imageArch }}</a-descriptions-item>
          <a-descriptions-item label="仓库">{{ imageRegistry }}</a-descriptions-item>
          <a-descriptions-item label="版本">{{ kubeVersion }}</a-descriptions-item>
          <a-descriptions-item label="容器引擎">{{ containerEngine }}</a-descriptions-item>
          <a-descriptions-item label="解压后大小">{{ offlineSizeTar }}</a-descriptions-item>
          <a-descriptions-item label="发布日期">{{ importTime }}</a-descriptions-item>
        </a-descriptions>
      </a-card>
      <a-card  title="空间占用" style="flex: 2.2;">
        <div style="display: flex; gap: 16px;">
        <pkgSizePie resType="pieSize" title="pieSize" :appData="processedData" :itemData="processedItemData" />
        <pkgSizeBar resType="barSize" title="barSize" :data="processedData" />
        </div>
      </a-card>
    </div>

    <a-card title="k8s系统软件包" style="margin-top: 16px;">
      <a-collapse :default-active-key="['1', 2]">
        <a-collapse-item header="文件" key="1">
          <a-table :columns="fileColumns" :data="dependencyFiles" :pagination="false" :loading="loading" />
        </a-collapse-item>
        <a-collapse-item header="镜像" key="2">
          <a-table :columns="imageColumns" :data="dependencyImages" :pagination="false" :loading="loading" />
        </a-collapse-item>
      </a-collapse>
    </a-card>

    <a-card title="网络插件" style="margin-top: 16px;">
      <a-collapse :default-active-key="['1']">
        <a-collapse-item v-for="plugin in networkPlugins" :key="plugin.name" :header="plugin.name">
          <a-tabs default-active-key="images">
            <a-tab-pane key="images" title="镜像">
              <a-table :columns="imageColumns" :data="plugin.dependency?.images || []" :pagination="false" :loading="loading" />
            </a-tab-pane>
            <a-tab-pane key="files" title="文件">
              <a-table :columns="fileColumns" :data="plugin.dependency?.files || []" :pagination="false" :loading="loading" />
            </a-tab-pane>
          </a-tabs>
        </a-collapse-item>
      </a-collapse>
    </a-card>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import useLoading from '@/hooks/loading';
  import { getResourcesDetail } from '@/api/resources';
  import { useRoute } from 'vue-router';
  import pkgSizeBar from '../components/pkgSizeBar.vue';
  import pkgSizePie from '../components/pkgSizePie.vue';

  const route = useRoute();
  const { loading, setLoading } = useLoading();

  const resourceDetail = ref<any>({});
  const packageName = ref<any>(route.query.package_name);

  const fileColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '版本', dataIndex: 'version', key: 'version' },
    { title: '路径', dataIndex: 'path', key: 'path' },
    { title: '文件名字', dataIndex: 'filename', key: 'filename' },
  ];

  const imageColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '版本', dataIndex: 'version', key: 'version' },
    { title: '标签', dataIndex: 'tag', key: 'tag' },
  ];

  const categories = [
    { name: "K8S系统", keys: ["files"] },
    { name: "网络插件", keys: ["network_plugins"] },
    { name: "K8S应用", keys: ["system_app"] },
    { name: "OS软件包", keys: ["os_repo_size"] }
  ];

  const detailItemData = [
    { name: "K8SFiles", keys: ["K8SFiles"] },
    { name: "K8SImages", keys: ["K8SImages"] },
    { name: "flannel files", keys: ["flannel_files"] },
    { name: "flannel images", keys: ["flannel_images"] },
    { name: "calico files", keys: ["calico_files"] },
    { name: "calico images", keys: ["calico_images"] },
    { name: "metrics-server images", keys: ["system_app_images"] },
    { name: "OS", keys: ["os_repo_size"] }
  ];

  const fetchResourcesDetail = async () => {
    try {
      setLoading(true);
      const result = await getResourcesDetail(packageName.value);
      resourceDetail.value = result.data;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchResourcesDetail();
  };

  const kubesprayVersion = computed(() => resourceDetail.value.config?.kubespray?.kubespray_version || 'N/A');
  const importTime = computed(() => resourceDetail.value.import_time || 'N/A');
  const supportedOs = computed(() => resourceDetail.value.config?.supported_os || []);
  const imageArch = computed(() => resourceDetail.value.config?.kubespray?.image_arch || 'N/A');
  const imageRegistry = computed(() => resourceDetail.value.config?.image_registry || 'N/A');
  const kubeVersion = computed(() => resourceDetail.value.config?.kubespray?.kube_version || 'N/A');
  const containerEngine = computed(() => resourceDetail.value.container_engine || 'N/A');
  const networkPlugins = computed(() => resourceDetail.value.config?.kubespray?.network_plugins || []);
  const dependencyFiles = computed(() => resourceDetail.value.config?.kubespray?.dependency?.files || []);
  const dependencyImages = computed(() => resourceDetail.value.config?.kubespray?.dependency?.images || []);
  const offlineSizeTar = computed(() => resourceDetail.value.config?.size || []);


const processData = () => {
  const sumSizes = (sizes: string[]) => sizes.reduce((acc, size) => {
    const num = parseFloat(size);
    if (isNaN(num)) {
      console.warn(`跳过无效的大小: ${size}`);
      return acc;
    }
    const unit = size.replace(/[0-9.]/g, "");
    if (unit === "M") return acc + num;
    if (unit === "K") return acc + num / 1024;
    if (unit === "G") return acc + num * 1024;
    return acc;
  }, 0);

  const getSizeInMB = (size: number) => `${size.toFixed(1)}M`;

  const getTotalSize = (categoryKeys: string[], resourceDetail: any) => {
    let totalSize = 0;
    if (categoryKeys.includes("os_repo_size") && resourceDetail?.config?.os_repo_size) {
      totalSize += sumSizes(resourceDetail.config.os_repo_size.map((repo: any) => repo.size));
    }
    if (categoryKeys.includes("files") && resourceDetail?.config?.kubespray?.dependency?.files) {
      const fileSizes= resourceDetail.config.kubespray.dependency.files.map((f: any) => f.size) || [];
      const imageSizes = resourceDetail.config.kubespray.dependency.images.map((f: any) => f.size) || [];
      totalSize += sumSizes([...fileSizes, ...imageSizes]);
    }

    if (categoryKeys.includes("network_plugins") && resourceDetail?.config?.kubespray?.network_plugins) {
      resourceDetail.config.kubespray.network_plugins.forEach((plugin: any) => {
        const fileSizes = plugin.dependency?.files?.map((f: any) => f.size) || [];
        const imageSizes = plugin.dependency?.images?.map((i: any) => i.size) || [];
        totalSize += sumSizes([...fileSizes, ...imageSizes]);
      });
    }

    if (categoryKeys.includes("system_app") && Array.isArray(resourceDetail?.config?.kubespray?.system_app)) {
      resourceDetail.config.kubespray.system_app.forEach((app: any) => {
        totalSize += sumSizes(app.dependency?.images?.map((i: any) => i.size) || []);
      });
    } else {
      //console.log("system_app is undefined or not an array");
    }
    return totalSize;
  };

  const result = categories.map(category => {
    const totalSize = getTotalSize(category.keys, resourceDetail.value);
    const sizeInMB = getSizeInMB(totalSize);
    //console.log({ name: category.name, value: sizeInMB });
    return {
      name: category.name,
      value: totalSize
    };
  });
  
  //console.log("Processed data:", result); 
  return result;
};

const processedData = computed(() => processData());

const processItemData = () => {
  const sumSizes = (sizes: string[]) => sizes.reduce((acc, size) => {
    const num = parseFloat(size);
    if (isNaN(num)) {
      console.warn(`跳过无效的大小: ${size}`);
      return acc;
    }
    const unit = size.replace(/[0-9.]/g, "");
    if (unit === "M") return acc + num;
    if (unit === "K") return acc + num / 1024;
    if (unit === "G") return acc + num * 1024;
    return acc;
  }, 0);

  const getSizeInMB = (size: number) => `${size.toFixed(1)}M`;

  const getTotalSize = (detailItemDataKeys: string[], resourceDetail: any) => {
    let totalSize = 0;
    if (detailItemDataKeys.includes("os_repo_size") && resourceDetail?.config?.os_repo_size) {
      totalSize += sumSizes(resourceDetail.config.os_repo_size.map((repo: any) => repo.size));
    }
    if (detailItemDataKeys.includes("K8SFiles") && resourceDetail?.config?.kubespray?.dependency?.files) {
      totalSize += sumSizes(resourceDetail.config.kubespray.dependency.files.map((f: any) => f.size));
    }
    if (detailItemDataKeys.includes("K8SImages") && resourceDetail?.config?.kubespray?.dependency?.files) {
      totalSize += sumSizes(resourceDetail.config.kubespray.dependency.images.map((f: any) => f.size));
    }

    if (detailItemDataKeys.includes("flannel_files") && resourceDetail?.config?.kubespray?.network_plugins) {
      totalSize += sumSizes(resourceDetail.config.kubespray.network_plugins[0].dependency?.files?.map((f: any) => f.size) || []);
    }

    if (detailItemDataKeys.includes("flannel_images") && resourceDetail?.config?.kubespray?.network_plugins) {
      totalSize += sumSizes(resourceDetail.config.kubespray.network_plugins[0].dependency?.images?.map((f: any) => f.size) || []);
    }
    if (detailItemDataKeys.includes("calico_files") && resourceDetail?.config?.kubespray?.network_plugins) {
      totalSize += sumSizes(resourceDetail.config.kubespray.network_plugins[1].dependency?.files?.map((f: any) => f.size) || []);
    }

    if (detailItemDataKeys.includes("calico_images") && resourceDetail?.config?.kubespray?.network_plugins) {
      totalSize += sumSizes(resourceDetail.config.kubespray.network_plugins[1].dependency?.images?.map((f: any) => f.size) || []);
    }


    if (detailItemDataKeys.includes("system_app_images") && Array.isArray(resourceDetail?.config?.kubespray?.system_app)) {
      resourceDetail.config.kubespray.system_app.forEach((app: any) => {
        totalSize += sumSizes(app.dependency?.images?.map((i: any) => i.size) || []);
      });
    }
    return totalSize;
  };

  const result = detailItemData.map(item => {
    const totalSize = getTotalSize(item.keys, resourceDetail.value);
    return {
      name: item.name,
      value: totalSize
    };
  });
  
  //console.log("item data:", result); 
  return result;
};

const processedItemData = computed(() => processItemData());

onMounted(() => {
  fetchResourcesDetail();
});
</script>

<style scoped>
  .container {
    padding: 24px;
  }
  .nav-btn-container {
    display: flex;
    justify-content: flex-end;
  }
  .nav-btn {
    margin: 0;
  }
  .descriptions-container {
    margin-left: 25px
  }
</style>
