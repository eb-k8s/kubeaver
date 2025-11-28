<template>
    <div class="container">
        <a-breadcrumb :style="{fontSize: '14px', marginTop: '16px', marginBottom: '16px'}">
        <a-breadcrumb-item>
            <icon-apps />
        </a-breadcrumb-item>
        <a-breadcrumb-item>{{ t('list.breadcrumb.install') }}</a-breadcrumb-item>
        </a-breadcrumb>
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
                        <icon-refresh />
                    </a-button>
                    <a-button type="primary" @click="handleCreateCluster()" :style="{ marginBottom: '10px' }">
                        {{ t('list.button.create') }}
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
                            <span>{{ record.version }}</span>
                        </div>
                    </template>
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
                                v-if="record.status === 'Ready,SchedulingDisabled'" 
                                class="circle pause"
                            ></span>
                            <span 
                                v-if="record.status === 'NotReady' || record.status === 'NotReady,SchedulingDisabled'" 
                                class="circle failed"
                            ></span>
                            <span class="status-text">{{ record.status }}</span>
                        </div>
                    </template>
                    <template #taskProcess="{ record }">
                        <div class="status-container">
                            <span v-if="translateTaskProcess(record.taskProcess) !== t('list.task.process.unknown')" class="status-icon running">
                                <icon-sync class="rotating" />
                            </span>
                            <span va_if="translateTaskProcess(record.taskProcess) === t('list.task.process.unknown')" class="circle Unknown"></span>
                            <span class="status-text1">{{ translateTaskProcess(record.taskProcess) }}</span>
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
                                v-if="record.taskProcess === 'Unknown' && record.status === 'Ready' && hasHigherVersion(record)" 
                                type="text" 
                                size="small" 
                                @click="onClickUpgrade(record)">
                                {{ t('list.button.upgrade') }}
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Ready' && record.taskProcess === 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="handleLink(record)">
                                {{ t('list.button.appManagement') }}
                            </a-button>
                            <a-button 
                                v-if="record.taskProcess === 'Unknown' && record.status === 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickDeploy(record)">
                                {{ t('list.button.deploy') }}
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Unknown' && record.taskProcess === 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickEdit(record)">
                                {{ t('list.button.edit') }}
                            </a-button>
                            <a-button 
                                v-if="record.taskProcess === 'Unknown' && record.status !== 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickReset(record)">
                                {{ t('list.button.reset') }}
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Unknown' && record.taskProcess === 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickDeleteBeforeDeploy(record)">
                                {{ t('list.button.delete') }}
                            </a-button>
                            <a-button 
                                v-if="record.status === 'Ready' && record.taskProcess === 'Unknown'" 
                                type="text" 
                                size="small" 
                                @click="onClickDownloadConfig(record)">
                                {{ t('list.button.downloadConfig') }}
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
           {{ t('list.modal.deploy.title', { version: version }) }}
        </a-modal>
        <a-modal v-model:visible="resetVisible" @ok="handleResetOk" @cancel="handleResetCancel">
            <template #title>
                <span>{{ t('list.modal.reset.title') }}</span>
            </template>
            <p>{{ t('list.modal.reset.content', { name: name }) }}</p>
            <p style="color: red; font-weight: bold;">{{ t('list.modal.reset.warning') }}</p>
        </a-modal>
        <a-modal v-model:visible="deleteVisible" @ok="handleDeleteOk" @cancel="handleDeleteCancel">
            {{ t('list.modal.delete.content', { name: name }) }}
        </a-modal>
        <a-modal v-model:visible="upgradeVisible" @ok="handleUpgradeOk" @cancel="handleUpgradeCancel">
            <a-form :model="cluster" style="margin-top: 20px;">
                <a-form-item
                    :label="t('list.form.label.version')"
                    field="version"
                    :rules="[{ required: true, message: t('list.form.placeholder.version') }]"
                    >
                    <a-select
                        v-model="cluster.version"
                        class="select-input"
                        :placeholder="t('list.form.placeholder.version')"
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
            <a-form :model="cluster" style="margin-top: 20px;">
                <a-form-item
                    :label="t('list.form.label.networkPlugins')"
                    field="networkPlugins"
                    :rules="[{ required: true, message: t('list.form.placeholder.networkPlugins') }]"
                    >
                    <a-select
                        v-model="cluster.networkPlugins"
                        class="select-input"
                        :placeholder="t('list.form.placeholder.networkPlugins')"
                        style="width: 400px;"
                    >
                        <a-option
                            v-for="plugin in formattedPlugins" :key="plugin.name + plugin.version"
                        >
                        {{`${plugin.name} - ${plugin.version}`}}
                        </a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>
<script lang="ts" setup>
    import { useI18n } from 'vue-i18n';
    import { ref, onMounted, reactive, computed, watch } from 'vue';
    import router from '@/router';
    import useLoading from '@/hooks/loading';
    import { getResources } from '@/api/resources';
    import { getClusterList, deleteBeforeDeployCluster, deployCluster, resetCluster, downloadConfig } from '@/api/cluster';
    import { upgradeCluster } from '@/api/tasks';
    import { getHostList } from '@/api/hosts';
    import { getNodeList } from '@/api/node';
    import { Message } from '@arco-design/web-vue';
    import { formatTime } from '@/utils/time';
    import { saveAs } from 'file-saver';

    const { t } = useI18n();
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
    const networkPlugins = ref();
    const originalPlugin = ref();
    const upgradeK8sVersion = ref();
    const nodeList = ref([]);
    const cluster = reactive({
        version: '',
        networkPlugins: ''
    });
    const name = ref();

    const getFirstK8sVersionFromStorage = (key = 'k8sVersionList'): string => {
        const versionArrayStr = localStorage.getItem(key);
        if (versionArrayStr) {
            try {
                const versionArray = JSON.parse(versionArrayStr);
                if (Array.isArray(versionArray) && versionArray.length > 0) {
                    return versionArray[0]; // 返回第一个版本
                }
            } catch (parseError) {
                console.error(t('list.message.error.versionParse'), parseError);
            }
        }
        return '';
    };

    const getVersion = (version) => {
        if (typeof version !== 'string' || !version.includes('.')) {
            return 'logo';
        }

        const versionParts = version.split('.');
        const versionKey = `${versionParts[0]}.${versionParts[1]}`;

        return k8sLogos.value[versionKey] ? versionKey : 'logo';
    };

    const fetchResourcesList = async () => {
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error(t('list.message.error.noBackend'));
            return;
        }
        try {
            setLoading(true);
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result: any = await getResources(k8sVersion);
            result.data.forEach(item => {
                if (item.name === 'k8s_cache') {
                    k8sCache.value = item
                }else if (item.name === 'network_plugins') {
                    networkPlugins.value = item
                } 
            })
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const formattedPlugins = computed(() => {
        if (!networkPlugins.value || !networkPlugins.value.children) {
            console.warn('networkPlugins 或其 children 为空');
            return [];
        }

        const k8sVersion = cluster.version;
        if (!k8sVersion) {
            console.warn('cluster.version 为空');
            return [];
        }

        const installedPluginType = originalPlugin.value?.split(' - ')[0]?.toLowerCase();
        if (!installedPluginType) {
            console.warn('installedPluginType 为空');
            return [];
        }

        const parseVersion = (version: string) => {
            const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
            return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
        };

        const k8sVersionParsed = parseVersion(k8sVersion);
        if (!k8sVersionParsed) {
            console.warn('k8sVersionParsed 解析失败:', k8sVersion);
            return [];
        }

        const matchedPlugin = networkPlugins.value.children.find(plugin => 
            plugin.name.toLowerCase() === installedPluginType
        );
        if (!matchedPlugin || !matchedPlugin.children) {
            console.warn('未找到匹配的插件:', installedPluginType);
            return [];
        }
        return matchedPlugin.children.filter(versionNode => {
            const pluginVersionParsed = parseVersion(versionNode.name);
            if (!pluginVersionParsed) return false;

            const [k8sMajor, k8sMinor] = k8sVersionParsed;
            const [, pluginMinor] = pluginVersionParsed;

            if (installedPluginType === 'calico') {
                if (k8sMajor === 1 && k8sMinor >= 25 && k8sMinor <= 27) {
                    return pluginMinor <= 25;
                } else if (k8sMajor === 1 && k8sMinor >= 28 && k8sMinor <= 30) {
                    return pluginMinor >= 26;
                }
                return false;
            }

            return true;
        }).map(versionNode => {
            const imagesNode = versionNode.children?.find(child => child.name === 'images');
            return {
                name: matchedPlugin.name,
                version: versionNode.name,
                images: imagesNode?.children || [],
                files: versionNode.children?.filter(child => child.name !== 'images' && child.type === 'file') || []
            };
        });
    });

    // 创建集群
    const handleCreateCluster = async () => {
        router.push(`/cluster/create`);
    }

    // 页面刷新
    const handleRefresh = async () =>{
        fetchClusterList();
    }

    const onClickView = (record: { clusterName: string; id: string; version: string; master1: string; upgradeVersion?: string }) => {
        const query: any = {
            id: record.id,
            clusterName: record.clusterName,
            version: record.version,
            master1: record.master1,
        };

        if (cluster.version) {
            query.upgradeVersion = cluster.version;
        }

        router.push({
            path: `/cluster/detail/${record.clusterName}`,
            query
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
        version.value = record.version
        if(record.upgradeK8sVersion){
            upgradeK8sVersion.value = record.upgradeK8sVersion
        };
    }

    const onClickUpgrade = async (record: any) => {
        upgradeVisible.value = true;
        id.value = record.id;
        clusterName.value = record.clusterName;
        originalPlugin.value = record.networkPlugin;

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
        // 设置默认网络插件值
        if (originalPlugin.value) {
            cluster.networkPlugins = originalPlugin.value;
        } else {
            cluster.networkPlugins = ''; // 如果没有默认值，设置为空
        }
    };

    // 处理升级时的离线包
    const hasHigherVersion = (record: any) => {
        if (!k8sCache.value || !Array.isArray(k8sCache.value.children)) {
            return false;
        }

        const currentVersionParts = record.version.replace('v', '').split('.').map(Number);

        return k8sCache.value.children.some((item: any) => {
            if (!item?.name) return false;

            const packageVersionParts = item.name.replace('v', '').split('.').map(Number);

            if (packageVersionParts.length < 3 || currentVersionParts.length < 3) return false;

            const [curMajor, curMinor, curPatch] = currentVersionParts;
            const [pkgMajor, pkgMinor, pkgPatch] = packageVersionParts;

            // 判断是否比当前版本高一个版本
            // return (
            //     (pkgMajor === curMajor && pkgMinor === curMinor + 1 && pkgPatch === 0) || // 次版本号 +1
            //     (pkgMajor === curMajor && pkgMinor === curMinor && pkgPatch === curPatch + 1) || // 补丁号 +1
            //     (pkgMajor === curMajor + 1 && pkgMinor === 0 && pkgPatch === 0) // 主版本号 +1
            // );

            // return (
            //     (pkgMajor === curMajor && pkgMinor === curMinor + 1) || // 次版本号 +1
            //     (curMinor === 9 && pkgMinor === 0 && pkgMajor === curMajor + 1) // 大版本升级：9.x -> (x+1).0
            // );
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
   
    // 集群升级
    const handleUpgradeOk = async () => {
        try {
        const data = {
            id : id.value,
            clusterName: clusterName.value,
            version: cluster.version,
            networkPlugin: cluster.networkPlugins,
        }
        if(cluster.version === ''){
            Message.error("请选择集群版本");
            return;
        }
        if (!cluster.networkPlugins) {
            Message.error("请选择网络插件");
            return;
        }

        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的 Kubernetes 版本对应的后端，请退出重新登录！");
            return;
        }

        const versionMap: Record<string, string> = JSON.parse(versionMapStr);

        const majorMinorVersion = data.version.match(/^v?\d+\.\d+/)?.[0];
        if (!majorMinorVersion) {
            Message.error("无法解析集群版本，请检查版本格式！");
            return;
        }

        const k8sVersion = versionMap[majorMinorVersion];
        if (!k8sVersion) {
            Message.error("所选的 Kubernetes 版本对应的后端不存在或未启动，请选择其他版本或启动对应的后端！");
            return;
        }
        const result: any = await upgradeCluster(data, k8sVersion);
        if(result.status === 'ok'){
            Message.info("集群正在升级,请稍后......");
            localStorage.setItem('createdCluster', JSON.stringify(data));
            fetchClusterList();
        }else{
            Message.error(result.msg);
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
        fetchNodeList(id.value);
        if(record.upgradeK8sVersion){
            upgradeK8sVersion.value = record.upgradeK8sVersion
        };
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
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }
        try {
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result: any = await downloadConfig(record.id, k8sVersion);
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

        let versionMap: Record<string, string>;
        try {
            const versionMapStr = localStorage.getItem('k8sVersionMap');
            if (!versionMapStr) {
                Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
                return;
            }
            versionMap = JSON.parse(versionMapStr);
        } catch (err) {
            Message.error("版本映射解析失败，请退出重新登录！");
            return;
        }

        // 获取目标版本号
        const selectedVersion = upgradeK8sVersion.value || version.value;
        const majorMinorVersion = selectedVersion.match(/^v?\d+\.\d+/)?.[0];

        if (!majorMinorVersion) {
            Message.error("无法解析 Kubernetes 主次版本，请检查格式！");
            return;
        }

        const k8sVersion = versionMap[majorMinorVersion];
        if (!k8sVersion) {
            Message.error("所选版本对应的后端不存在或未启动，请更换版本或启动后端！");
            return;
        }
        
        try {
            const result: any = await resetCluster(id.value, k8sVersion);
            if(result.status === 'ok'){
                Message.info("正在重置集群,请稍后......");
                fetchClusterList();
            }else{
                Message.error(result.msg);
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

    //获取集群节点列表
    const fetchNodeList = async (id:any) => { 
      try {
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }
        setLoading(true);
        const k8sVersion = getFirstK8sVersionFromStorage();
        const result = await getNodeList(id, k8sVersion);
        console.log("获取集群节点列表：", result);
        nodeList.value = result.data;
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    const handleDeployOk = async () => {

        let count = 0;
        nodeList.value.forEach(itme => {
            if(itme.role === 'master'){
                count += 1;
            }
        });
        // 校验控制节点个数是否为单数
        if (count % 2 ===0 ) {
            Message.warning(`列表中现有${count}个master，建议保持单数以保证高可用！`);
            return;
        }

        let versionMap: Record<string, string>;
        try {
            const versionMapStr = localStorage.getItem('k8sVersionMap');
            if (!versionMapStr) {
                Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
                return;
            }
            versionMap = JSON.parse(versionMapStr);
        } catch (err) {
            Message.error("版本映射解析失败，请退出重新登录！");
            return;
        }

        // 获取目标版本号
        const selectedVersion = upgradeK8sVersion.value || version.value;
        const majorMinorVersion = selectedVersion.match(/^v?\d+\.\d+/)?.[0];

        if (!majorMinorVersion) {
            Message.error("无法解析 Kubernetes 主次版本，请检查格式！");
            return;
        }

        const k8sVersion = versionMap[majorMinorVersion];
        if (!k8sVersion) {
            Message.error("所选版本对应的后端不存在或未启动，请更换版本或启动后端！");
            return;
        }

        console.log("部署集群参数：", k8sVersion);
    
        // 调用部署接口
        try {
            const params = { id: id.value };
            const result: any = await deployCluster(params, k8sVersion);

            if (result.status === 'ok') {
                Message.success("正在安装集群，请稍后...");
                fetchClusterList();
            } else {
                Message.error(result.msg || "集群部署失败！");
            }
        } catch (err) {
            console.error("部署异常：", err);
            Message.error("部署过程中发生异常，请查看控制台日志！");
        }
    };

    const handleDeployCancel = async () => {
        deployVisible.value = false;
    }

    const handleDeleteOk = async () => {
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }
        try {
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result: any = await deleteBeforeDeployCluster(id.value,k8sVersion);
            if(result.status === 'ok'){
                Message.success("删除成功！");
                await fetchClusterList();
            }else{
                Message.error(result.msg);
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
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }
        try {
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result = await getHostList(k8sVersion);
            hostList.value = result.data;
        } catch (err) {
            console.log(err);
        }
    };

    const fetchClusterList = async () => {
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }
        try {
            setLoading(true);
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result = await getClusterList(k8sVersion);
        
            clusterList.value = result.data.map(cluster => ({
                ...cluster,
                createTime: formatTime(cluster.createTime),
                count: (cluster.masterCount + cluster.nodeCount)+"("+cluster.masterCount+"/"+ cluster.nodeCount+")",
            }));
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };
    const processMap: Record<string, string> = {
        Unknown: t('list.task.process.unknown'),
        deploying: t('list.task.process.deploying'),
        upgrading: t('list.task.process.upgrading'),
        resetting: t('list.task.process.resetting'),
    };

    const translateTaskProcess = (taskProcess: string) => {
        return processMap[taskProcess] || taskProcess;
    };

    // 校验当前选择的插件是否与当前 K8s 版本兼容
    watch([() => cluster.version, () => cluster.networkPlugins], ([newVersion, newPlugin]) => {
        if (!newVersion || !newPlugin) return;

        const match = formattedPlugins.value.find(
            plugin => `${plugin.name} - ${plugin.version}` === newPlugin
        );

        if (!match) {
            Message.warning('当前 Kubernetes 版本与所选网络插件不兼容，请重新选择');
            cluster.networkPlugins = ''; 
        }
    });
   
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
  
    const columns = computed(() => [            
    {
        title: '',
        dataIndex: 'icon',
        slotName: 'icon',
    },
    {
        title: t('list.table.header.name'),
        dataIndex: 'clusterName',
        slotName: 'clusterName',
    },
    {
        title: t('list.table.header.version'),
        dataIndex: 'version',
        slotName: 'version',
    },
  
    {
        title: t('list.table.header.nodes'),
        dataIndex: 'count',
        slotName: 'count',
    },
    // {
    //     title: 'master1',
    //     dataIndex: 'master1',
    //     slotName: 'master1',
    // },
    {
        title: t('list.table.header.status'),
        dataIndex: 'status',
        slotName: 'status',
    },
    // {
    //     title: '活跃任务',
    //     dataIndex: 'activeTask', 
    //     slotName: 'activeTask',
    // },
    {
        title: t('list.table.header.task'),
        dataIndex: 'taskProcess', 
        slotName: 'taskProcess',
    },
    {
        title: t('list.table.header.createTime'),
        dataIndex: 'createTime',
    },
 
    {
        title: t('list.table.header.action'),
        dataIndex: 'operations',
        slotName: 'operations',
    }
    ]);
   
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
    
    .pause {
        background-color: #faad14;
    }

    .status-text {
        white-space: nowrap; 
        word-break: keep-all; 
        font-size: 14px; 
        line-height: 1; 
    }

    .rotating {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg); 
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .status-icon.running {
        color: #52c41a; 
        font-size: 24px;
    }

</style>