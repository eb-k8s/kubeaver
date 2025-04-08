<template>
    <div class="container">
        <a-breadcrumb :style="{fontSize: '14px', marginTop: '16px', marginBottom: '16px'}">
        <a-breadcrumb-item>
            <icon-apps />
        </a-breadcrumb-item>
        <a-breadcrumb-item>安装部署</a-breadcrumb-item>
        </a-breadcrumb>
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
                        <icon-refresh />
                    </a-button>
                    <a-button type="primary" @click="handleCreateCluster()" :style="{ marginBottom: '10px' }">
                        创建集群
                    </a-button>
                </div>
                <a-table :columns="columns" :data="clusterList" :loading="loading">
                    <template #icon="{ record }">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                            <img 
                                :src="k8sLogos[getVersion(record.version)]" 
                                alt="K8s Logo" 
                                style="width: 50px; height: 50px; margin-right: 8px;"
                                v-if="k8sLogos[getVersion(record.version)]"
                            />
                        </div>
                    </template>
                    <template #version="{ record }">
                        <div style="display: flex; align-items: center;">
                            <!-- <img 
                                :src="k8sLogos[getVersion(record.version)]" 
                                alt="K8s Logo" 
                                style="width: 30px; height: 30px; margin-right: 8px;"
                                v-if="k8sLogos[getVersion(record.version)]"
                            /> -->
                            <span>{{ record.version }}</span>
                        </div>
                    </template>
                    <!-- <template #offlinePackage="{ record }"> 
                        <a-link @click="onClickOfflinePackageView(record)">{{ record.offlinePackage }}</a-link>
                    </template> -->
                    <template #status="{ record }">
                        <div class="status-container">
                            <span 
                                v-if="record.status === 'Ready'" 
                                class="circle Ready"
                            ></span>
                            <span 
                                v-if="record.status === 'Unknown'" 
                                class="circle Unknown"
                            ></span>
                            <span 
                                v-if="record.status === 'NotReady'" 
                                class="circle failed"
                            ></span>
                            <span class="status-text">{{ record.status }}</span>
                        </div>
                    </template>
                    <template #activeTask="{ record }">
                        <div style="white-space: pre-line; display: flex; flex-direction: column; align-items: flex-start;">
                            <span :style="{ color: record.initCluster !== 0 ? '#52c41a' : 'black', display: 'block' }">初始化集群: {{ record.initCluster }}</span>
                            <span :style="{ color: record.addNode !== 0 ? '#52c41a' : 'black', display: 'block' }">添加节点: {{ record.addNode }}</span>
                            <span :style="{ color: record.upgradeCluster !== 0 ? '#52c41a' : 'black', display: 'block' }">升级集群: {{ record.upgradeCluster }}</span>
                            <span :style="{ color: record.resetNode !== 0 ? '#52c41a' : 'black', display: 'block' }">重置节点: {{ record.resetNode }}</span>
                            <span :style="{ color: record.resetCluster !== 0 ? '#52c41a' : 'black', display: 'block' }">重置集群: {{ record.resetCluster }}</span>
                        </div>
                    </template>
                    <template #operations="{ record }">
                        <div 
                            style="
                                display: grid; 
                                grid-template-columns: repeat(2, auto); 
                                gap: 8px; 
                                justify-items: start;
                            "
                        >
                            <a-button 
                                v-if="isActiveTaskEmpty(record.activeTask) && record.status === 'Ready' && hasHigherVersion(record)" 
                                type="text" 
                                size="small" 
                                @click="onClickUpgrade(record)">
                                升级
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Ready'" 
                                type="text" 
                                size="small" 
                                @click="handleLink(record)">
                                容器云
                            </a-button>
                            <a-button 
                                v-if="isActiveTaskEmpty(record.activeTask) && record.status === 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickDeploy(record)">
                                部署
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Unknown' && isActiveTaskEmpty(record.activeTask)" 
                                type="text" 
                                size="small" 
                                @click="onClickEdit(record)">
                                编辑
                            </a-button>
                            <a-button 
                                v-if="isActiveTaskEmpty(record.activeTask) && record.status !== 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickReset(record)">
                                重置
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Unknown' && isActiveTaskEmpty(record.activeTask)" 
                                type="text" 
                                size="small" 
                                @click="onClickDeleteBeforeDeploy(record)">
                                删除
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Ready' && isActiveTaskEmpty(record.activeTask)" 
                                type="text" 
                                size="small" 
                                @click="onClickDownloadConfig(record)">
                                证书下载
                            </a-button>
                        </div>
                    </template>
                    <template #clusterName="{ record }"> 
                        <a-link @click="onClickView(record)">{{ record.clusterName }}</a-link>
                    </template>
                </a-table>
            </a-card>
        </div>
        <a-modal v-model:visible="deployVisible" @ok="handleDeployOk" @cancel="handleDeployCancel">
           确定部署<span style="color: red; font-weight: bold;">{{ version }}</span>版本的集群吗？
        </a-modal>
        <!-- <a-modal v-model:visible="resetVisible" @ok="handleResetOk" @cancel="handleResetCancel">
           确定重置{{name}}集群吗？
        </a-modal> -->
        <a-modal v-model:visible="resetVisible" @ok="handleResetOk" @cancel="handleResetCancel">
            <template #title>
                <span>重置确认</span>
            </template>
            <p>确定重置 <span style="color: red; font-weight: bold;">{{ name }}</span> 集群吗？</p>
            <p style="color: red; font-weight: bold;">警告：重置操作不可恢复，请谨慎操作！</p>
        </a-modal>
        <a-modal v-model:visible="deleteVisible" @ok="handleDeleteOk" @cancel="handleDeleteCancel">
            确定删除 <span style="color: red; font-weight: bold;">{{ name }}</span> 的集群吗？
        </a-modal>
        <a-modal v-model:visible="upgradeVisible" @ok="handleUpgradeOk" @cancel="handleUpgradeCancel">
            <a-form :model="cluster" style="margin-top: 20px;">
                <a-form-item
                    label="版本："
                    field="version"
                    :rules="[{ required: true, message: '请选择集群版本' }]"
                    >
                    <a-select
                        v-model="cluster.version"
                        class="select-input"
                        placeholder="请选择集群版本"
                        style="width: 400px;"
                    >
                        <a-option
                            v-for="version in resourceList || []"
                            :key="version.name"
                            :value="version.name"
                        >
                            {{ version.name }}
                        </a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>
<script lang="ts" setup>
    import { ref, onMounted, reactive } from 'vue';
    import router from '@/router';
    import useLoading from '@/hooks/loading';
    import { getResources } from '@/api/resources';
    import { getClusterList, deleteBeforeDeployCluster, deployCluster, resetCluster, downloadConfig } from '@/api/cluster';
    import { upgradeCluster } from '@/api/tasks';
    import { getHostList } from '@/api/hosts';
    import { Message } from '@arco-design/web-vue';
    import { formatTime } from '@/utils/time';
    import { saveAs } from 'file-saver';

    const { loading, setLoading } = useLoading();
    const deleteVisible = ref(false);
    const deployVisible = ref(false);
    const resetVisible = ref(false);
    const upgradeVisible = ref(false);
    const version = ref();
    const clusterName = ref();
    const resourceList = ref();
    const clusterList = ref();
    const clusterStatus = ref();
    const hostList = ref();
    const id = ref();
    const k8sLogos = ref({});
    const k8sCache = ref();
    const cluster = reactive({
        version: '',
    });
    const name = ref();

    const getVersion = (version) => {
        if (typeof version !== 'string' || !version.includes('.')) {
            return 'logo';
        }

        const versionParts = version.split('.');
        const versionKey = `${versionParts[0]}.${versionParts[1]}`;

        return k8sLogos.value[versionKey] ? versionKey : 'logo';
    };


    // 比较版本号的工具函数
    const compareVersions = (version1: string, version2: string) => {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);
        for (let i = 0; i < v1.length; i++) {
            if (v1[i] > v2[i]) return 1;
            if (v1[i] < v2[i]) return -1;
        }
        return 0;
    };

    // 检查折叠面板中的table是否有数据
    const isActiveTaskEmpty = (task) => {
        const taskValues = task
            .split('\n')
            .map(line => parseInt(line.split(':')[1], 10)) 
            .filter(value => !isNaN(value));

        return taskValues.every(value => value === 0);
    };

    const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const result: any = await getResources();
            result.data.forEach(item => {
                if (item.name === 'k8s_cache') {
                    k8sCache.value = item
                } 
            })
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    // 创建集群
    const handleCreateCluster = async () => {
        router.push(`/cluster/create`);
    }

    // 页面刷新
    const handleRefresh = async () =>{
        fetchClusterList();
    }

    // 查看集群的详情
    const onClickView = (record: { clusterName: string; id: string; version: string; master1: string; }) => {
        router.push({
            path: `/cluster/detail/${record.clusterName}`,
            query: { id: record.id, clusterName: record.clusterName, version: cluster.version, master1: record.master1 }
        });
    };
    
    // 安装部署之前编辑集群信息
    const onClickEdit = (record: { clusterName: string; id: string; offlinePackage: string; version: string; taskNum: string}) => {
        router.push({
            path: `/cluster/edit/${record.clusterName}`,
            query: { id: record.id, version: record.version, taskNum: record.taskNum }
        });
    };

    // 跳转到容器云网站
    const handleLink = (record: any) => {

        // const url = `${window.location.protocol}://${window.location.host}/kubeadmin/gotocluster/${record.clusterId}`;
        const url = `/kubeadmin/gotocluster/${record.clusterId}`;
        window.open(url, '_blank');
    };


    // 重置集群
    const onClickReset = async (record: any) => {
        resetVisible.value = true;
        id.value = record.id;
        name.value = record.clusterName;
    }

    const onClickUpgrade = async (record: any) => {
        upgradeVisible.value = true;
        id.value = record.id;
        clusterName.value = record.clusterName;

        const currentVersionParts = record.version.replace('v', '').split('.').map(Number);

        resourceList.value = k8sCache.value.children.filter((item: any) => {
            if (!item.name) return false;

            // 解析版本号
            const packageVersionParts = item.name.replace('v', '').split('.').map(Number);

            if (packageVersionParts.length < 3 || currentVersionParts.length < 3) return false;

            const [curMajor, curMinor, curPatch] = currentVersionParts;
            const [pkgMajor, pkgMinor, pkgPatch] = packageVersionParts;

            return (
                pkgMajor === curMajor &&
                (
                    pkgMinor === curMinor + 1 ||  // 次版本号 +1
                    (pkgMinor === curMinor && pkgPatch === curPatch + 1) || // 补丁号 +1
                    (curMinor === 9 && pkgMinor === 0 && pkgMajor === curMajor + 1 && pkgPatch === 0) // 版本大升级 9.x -> (x+1).0.0
                )
            );
        });
    };


    // 处理升级时的离线包
    const hasHigherVersion = (record: any) => {
        if (!k8sCache.value || !Array.isArray(k8sCache.value.children)) {
            return false;
        }

        return k8sCache.value.children.some((item: any) => {
            if (item?.name) {
                return compareVersions(item.name, record.version) === 1;
            }
            return false;
        });
    };


    // 集群升级
    const handleUpgradeOk = async () => {
        try {
        const data = {
            id : id.value,
            clusterName: clusterName.value,
            version: cluster.version,
        }
        if(cluster.version === ''){
            Message.error("请选择集群版本");
            return;
        }
        const result: any = await upgradeCluster(data);
        if(result.status === 'ok'){
            Message.info("集群正在升级,请稍后......");
            localStorage.setItem('createdCluster', JSON.stringify(data));
            fetchClusterList();
        }
      } catch (err) {
        console.log(err);
      }
    }

    const handleUpgradeCancel = async() => {
        upgradeVisible.value = false;
        cluster.version = '';
    }

    // 安装部署集群
    const onClickDeploy = async (record: any) => {
        version.value = record.version;
        id.value = record.id;
        deployVisible.value = true;
    }

    // 安装之前删除
    const onClickDeleteBeforeDeploy = async (record: any) => {
        deleteVisible.value = true;
        id.value = record.id;
        clusterStatus.value = record.status;
        name.value = record.clusterName
    }

    // 下载证书
    const onClickDownloadConfig = async (record: any) => {

        try {
            const result: any = await downloadConfig(record.id);
            const fileName = record.clusterName+'-config.yaml';
            const blob = new Blob([result.data]);
            saveAs(blob, fileName);
        } catch (err) {
            console.log(err);
        } finally {
        }
    }

     // 集群扫描
     const onClickClusterScan = async (record: any) => {

        try {
            Message.info("集群正在扫描中,请进详情页查看扫描结果");
        } catch (err) {
            console.log(err);
        } finally {
        }
    }

    // 重置集群
    const handleResetOk = async () => {
        try {
        const result: any = await resetCluster(id.value);
        if(result.status === 'ok'){
            Message.info("正在重置集群,请稍后......");
            fetchClusterList();
        }
      } catch (err) {
        console.log(err);
      } finally {
      }
    }

    // 重置按钮的取消
    const handleResetCancel = async () => {
        resetVisible.value = false;
    }

    const handleDeployOk = async () => {
        try {
        const data = {
            id : id.value,
        };
        const result: any = await deployCluster(data);
        if(result.status === 'ok'){
            Message.info("正在安装集群,请稍后......");
            fetchClusterList();
        }
      } catch (err) {
        console.log(err);
      } 
    }

    const handleDeployCancel = async () => {
        deployVisible.value = false;
    }

    const handleDeleteOk = async () => {
      try {
        const result: any = await deleteBeforeDeployCluster(id.value);
        if(result.status === 'ok'){
            Message.success("删除成功！");
            await fetchClusterList();
        }
      } catch (err) {
        console.log(err);
      } 
    }
  
    const handleDeleteCancel = () => {
      deleteVisible.value = false;
    }

    //获取主机列表
    const fetchHostList = async () => {
      try {
        const result = await getHostList();
        hostList.value = result.data;
      } catch (err) {
        console.log(err);
      }
    };

    const fetchClusterList = async () => {
        try {
            setLoading(true);
            const result = await getClusterList();
            clusterList.value = result.data.map(cluster => ({
                ...cluster,
                createTime: formatTime(cluster.createTime),
                count: (cluster.masterCount + cluster.nodeCount)+"("+cluster.masterCount+"/"+ cluster.nodeCount+")",
                activeTask: `
                    初始化集群: ${cluster.initCluster}
                    添加节点: ${cluster.addNode}
                    重置节点: ${cluster.resetNode}
                    升级集群: ${cluster.upgradeCluster}
                    重置集群: ${cluster.resetCluster}
                `.trim(),
            }));
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };
   
    onMounted(async () => {
        k8sLogos.value['v1.22'] = (await import('@/assets/images/logo/k8s-1.22.png')).default;
        k8sLogos.value['v1.23'] = (await import('@/assets/images/logo/k8s-1.23.png')).default;
        k8sLogos.value['v1.24'] = (await import('@/assets/images/logo/k8s-1.24.png')).default;
        k8sLogos.value['v1.25'] = (await import('@/assets/images/logo/k8s-1.25.png')).default;
        k8sLogos.value['v1.26'] = (await import('@/assets/images/logo/k8s-1.26.png')).default;
        k8sLogos.value['v1.27'] = (await import('@/assets/images/logo/k8s-1.27.png')).default;
        k8sLogos.value['v1.28'] = (await import('@/assets/images/logo/k8s-1.28.png')).default;
        k8sLogos.value['v1.29'] = (await import('@/assets/images/logo/k8s-1.29.png')).default;
        k8sLogos.value['v1.30'] = (await import('@/assets/images/logo/k8s-1.30.png')).default;
        k8sLogos.value['v1.31'] = (await import('@/assets/images/logo/k8s-1.31.png')).default;
        k8sLogos.value['logo'] = (await import('@/assets/images/logo/logo.png')).default;
    });
    
    onMounted(() => {
        fetchClusterList();
        fetchResourcesList();
        fetchHostList();
    });
  
    const columns = [
    {
        title: '',
        dataIndex: 'icon',
        slotName: 'icon',
    },
    {
        title: '集群名称',
        dataIndex: 'clusterName',
        slotName: 'clusterName',
    },
    {
        title: '集群版本',
        dataIndex: 'version',
        slotName: 'version',
    },
  
    {
        title: '节点总数(master/node)',
        dataIndex: 'count',
        slotName: 'count',
    },
    {
        title: 'master1',
        dataIndex: 'master1',
        slotName: 'master1',
    },
    {
        title: '集群状态',
        dataIndex: 'status',
        slotName: 'status',
    },
    {
        title: '活跃任务',
        dataIndex: 'activeTask', 
        slotName: 'activeTask',
    },
    {
        title: '创建时间',
        dataIndex: 'createTime',
    },
 
    {
        title: '操作',
        dataIndex: 'operations',
        slotName: 'operations',
    },
    ];
   
</script> 
 
<style scoped lang="less">
    .container {
        padding: 0 20px 20px 20px;
    }
    .layout-demo :deep(.arco-layout-content) {
        display: flex;
        flex-direction: column;
        justify-content: center;
        color: var(--color-white);
        font-size: 16px;
        font-stretch: condensed;
        text-align: center;
    }
    .select-input {
        width: 320px;
    }
    .checkbox-spacing {
        margin-right: 20px; /* Adjust this value to control spacing */
    }

    .nav-btn {
      border-color: rgb(var(--gray-2));
      color: rgb(var(--gray-8));
      font-size: 16px;
    }

    .status-container {
        display: flex;
        align-items: center; /* 垂直居中对齐 */
        gap: 8px; /* 图标和文字之间的间距 */
    }

    .circle {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .Ready {
        background-color: #52c41a; 
    }

    .Unknown {
        background-color: gray;
    }

    .failed {
        background-color: red; 
    }

    .status-text {
        white-space: nowrap; 
        word-break: keep-all; 
        font-size: 14px; 
        line-height: 1; 
    }

</style>