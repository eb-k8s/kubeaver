<template>
    <div class="container">
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
                        <icon-refresh />
                    </a-button>
                    <a-button type="primary" @click="handleAddNode()" :style="{ marginBottom: '10px' }">
                        添加节点
                    </a-button>
                </div>
                <a-table :columns="columns" :data="nodeList" :loading="loading">
                    <template #icon="{ record }">
                        <div 
                            style="display: flex; align-items: center; justify-content: center; height: 100%;"
                        >
                            <img 
                                :src="roleLogos[record.role]" 
                                alt="Role Logo" 
                                style="width: 40px; height: 40px;"
                                v-if="roleLogos[record.role]"
                            />
                        </div>
                    </template>
                    <template #role="{ record }">
                        <div style="display: flex; align-items: center;">
                            <!-- <img 
                                :src="roleLogos[record.role]" 
                                alt="Role Logo" 
                                style="width: 20px; height: 20px; margin-right: 8px;"
                                v-if="roleLogos[record.role]"
                            /> -->
                            <span>{{ record.role }}</span>
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
                                v-if="record.status === 'NotReady'" 
                                class="circle failed"
                            ></span>
                            <span class="status-text">{{ record.status }}</span>
                        </div>
                    </template>
                    <template #activeStatus="{ record }">
                        <div class="status-container">
                            <span v-if="record.activeStatus === '运行中'" class="status-icon running">
                                <icon-sync class="rotating" />
                            </span>
                            <span v-if="record.activeStatus === '等待中'" class="status-icon waiting">
                                <icon-clock-circle />
                            </span>
                            <span v-if="record.activeStatus === '已完成'" class="status-icon completed">
                                <icon-check-circle />
                            </span>
                            <span class="status-text1">{{ record.activeStatus }}</span>
                        </div>
                    </template>
                    <template #lastJobStatus="{ record }">
                        <div class="status-container">
                            <span 
                                v-if="record.lastJobStatus === 'worked'" 
                                class="circle Ready"
                            ></span>
                            <span 
                                v-if="record.lastJobStatus === 'failed'" 
                                class="circle failed"
                            ></span>
                            <span class="status-text">{{ record.lastJobStatus }}</span>
                        </div>
                    </template>
                    <template #operations="{ record }">
                        <template v-if="record.role === 'master'">
                            <a-button v-if="record.status === 'Unknown' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickJoinMaster(record)">
                                加入
                            </a-button>
                            <a-button v-if="record.status === 'Unknown' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickDelete(record)">
                                删除
                            </a-button>
                            <a-button v-if="master1.value !== record.name && record.status !== 'Unknown' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickRemove(record)">
                                移除
                            </a-button>
                            <a-button v-if="record.lastJobType === 'upgradeCluster' && record.lastJobStatus === 'failed' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickRetry(record)">
                                重试
                            </a-button>
                        </template>
                        <template v-else-if="record.role === 'node'">
                            <a-button v-if="record.status === 'Unknown' && record.activeJobType === '暂无任务' && isMasterNotReadyAndDeploying" type="text" size="small" @click="onClickJoinNode(record)">
                                加入
                            </a-button>
                            <a-button v-if="record.status === 'Unknown' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickDelete(record)">
                                删除
                            </a-button>
                            <a-button v-if="record.status !== 'Unknown' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickRemove(record)">
                                移除
                            </a-button>
                            <a-button v-if="record.lastJobType === 'upgradeCluster' && record.lastJobStatus === 'failed' && record.activeJobType === '暂无任务'" type="text" size="small" @click="onClickRetry(record)">
                                重试
                            </a-button>
                        </template>
                    </template>
                </a-table>
            </a-card>
        </div>
    </div>
    <a-modal v-model:visible="joinVisible" @ok="handleJoinOk" @cancel="handleJoinCancel">
        <p>确定将 <span style="color: red; font-weight: bold;">{{ name }}</span> 节点加入到集群吗？</p>
    </a-modal>
    <a-modal v-model:visible="addNodeVisible" @ok="handleAddNodeOk" @cancel="handleAddNodeCancel">
        <a-card title="主机">
            <a-form-item label="控制节点" field="controlPlaneHosts" >
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <a-select
                            v-model="controlPlaneHost"
                            class="select-input"
                            placeholder="请选择控制节点主机"
                            style="flex: 1; margin-right: 10px;"
                            multiple
                        >
                            <a-option v-for="item in filteredControlPlaneHosts" :key="item.hostId" :value="item.hostIP">
                                {{ `${item.hostIP} (${item.os})` }}
                            </a-option>
                        </a-select>
                        <a-button type="primary" size="small" @click="addControlPlaneHost">添加</a-button>
                    </div>
                    <ul style="list-style: none; padding: 0; width: 100%;">
                        <li
                            v-for="(host, index) in cluster.controlPlaneHosts"
                            :key="index"
                            style="display: flex; align-items: center; margin-bottom: 8px; border: 1px dashed #d9d9d9; padding: 8px; border-radius: 4px;"
                        >
                            <span>{{ host.ip }}</span>
                            <span style="margin-left:10%;">名字：</span>
                            <a-input v-model="host.hostName" placeholder="请输入主机名" style="flex-grow: 1; width: 40%;" />
                            <a-button type="text" size="small" @click="removeControlPlaneHost(index)" style="color: #ff4d4f; font-size: 16px; padding: 0;">
                                <icon-close />
                            </a-button>
                        </li>
                    </ul>
                </div>
            </a-form-item>
        
            <a-form-item label="工作节点" field="workerHosts">
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <a-select
                            v-model="workerHost"
                            class="select-input"
                            placeholder="请选择工作节点主机"
                            style="flex: 1; margin-right: 10px;"
                            multiple
                        >
                            <a-option v-for="item in filteredWorkerHosts" :key="item.hostId" :value="item.hostIP">
                                <!-- {{ item.hostIP }} -->
                                {{ `${item.hostIP} (${item.os})` }}
                            </a-option>

                        </a-select>
                        <a-button type="primary" size="small" @click="addWorkerHost">添加</a-button>
                    </div>
                    <ul style="list-style: none; padding: 0; width: 100%;">
                        <li
                            v-for="(host, index) in cluster.workerHosts"
                            :key="index"
                            style="display: flex; align-items: center; margin-bottom: 8px; border: 1px dashed #d9d9d9; padding: 8px; border-radius: 4px;"
                        >
                            <span>{{ host.ip }}</span>
                            <span style="margin-left:10%;">名字：</span>
                            <a-input v-model="host.hostName" placeholder="请输入主机名" style="flex-grow: 1; width: 40%;" />
                            <a-button type="text" size="small" @click="removeWorkerHost(index)" style="color: #ff4d4f; font-size: 16px; padding: 0;">
                                <icon-close />
                            </a-button>
                        </li>
                    </ul>
                </div>
            </a-form-item>
        </a-card>
    </a-modal>
    <a-modal v-model:visible="deleteVisible" @ok="handleDeleteOk" @cancel="handleDeleteCancel">
       <p>确定删除 <span style="color: red; font-weight: bold;">{{ name }}</span> 节点吗？</p>
    </a-modal>
    <a-modal v-model:visible="removeVisible" @ok="handleRemoveOk" @cancel="handleRemoveCancel">
       <p>确定将 <span style="color: red; font-weight: bold;">{{ name }}</span> 节点从集群中移除吗？</p>
       <p style="color: red; font-weight: bold;">警告：移除操作不可恢复，请谨慎操作！</p>
    </a-modal>
</template>
<script lang="ts" setup>

    import { reactive, ref, onMounted, computed } from 'vue';
    import { getNodeList, deleteNode, removeNode, addNode, joinCluster } from '@/api/node';
    import { getResources } from '@/api/resources';
    import { deployCluster } from '@/api/cluster';
    import { upgradeCluster } from '@/api/tasks';
    import useLoading from '@/hooks/loading';
    import { useRoute } from 'vue-router';
    import { Message } from '@arco-design/web-vue';
    import { getAvailableHostList } from '@/api/hosts';
    import { formatTime } from '@/utils/time';

    const { loading, setLoading } = useLoading();

    const deleteVisible = ref(false);
    const addNodeVisible = ref(false);
    const joinVisible = ref(false);
    const removeVisible = ref(false);
    const nodeList = ref();
    const route = useRoute();
    const id = ref();
    const offlinePackage = ref();
    const nodeip = ref();
    const node = ref();
    // const workerHost = ref();
    const workerHost = ref<string[]>([]);
    const controlPlaneHost = ref();
    const hostList = ref();
    const nodeRole = ref();
    const roleLogos = ref({});
    const resourceList = ref();
    const supportedOS = ref();
    const repoFiles = ref();
    const version = ref();
    const clusterName = ref();
    const master1 = ref();
    const cluster = reactive({
        id: '',
        controlPlaneHosts: [] as Array<{ ip: string; hostName: string; role: string; os: string }>,
        workerHosts: [] as Array<{ ip: string; hostName: string; role: string; os: string }>
    });
    const name = ref();

    id.value = route.query.id;
    version.value = route.query.version;
    clusterName.value = route.query.clusterName;
    master1.value = route.query.master1;

    const hosts = computed(() => {
        return [
            ...cluster.workerHosts.map(host => ({
                ...host, 
                hostName: host.hostName,
                role: 'node'
            }))
        ];
    });

    const masterCount = computed(() => {
        return nodeList.value ? nodeList.value.filter(node => node.role === 'master').length : 0;
    });

    const isMasterNotReadyAndDeploying = computed(() => {
        return nodeList.value && nodeList.value.some(node =>
           node.role === 'master' && node.status !== 'Unknown' && node.activeJobType === '暂无任务' 
        );
    });

    const filteredControlPlaneHosts = computed(() => {

        if (!Array.isArray(hostList.value)) {
            return []; 
        }

        return hostList.value.filter((host) => {
            const osName = host?.os ? host.os.split(' ')[0] : ''; 
            const isOSCompatible = Array.isArray(supportedOS.value) && supportedOS.value.length
                ? supportedOS.value.includes(osName)
                : true;

            return (
                isOSCompatible &&
                Array.isArray(cluster.controlPlaneHosts) &&
                !cluster.controlPlaneHosts.some((selectedHost) => selectedHost.ip === host.hostIP) &&
                Array.isArray(cluster.workerHosts) &&
                !cluster.workerHosts.some((selectedHost) => selectedHost.ip === host.hostIP)
            );
        });
    });

    const filteredWorkerHosts = computed(() => {

        if (!Array.isArray(hostList.value)) {
            return []; 
        }
        return hostList.value.filter((host) => {
            
            const osName = host.os.split(' ')[0];
            const isOSCompatible = Array.isArray(supportedOS.value) && supportedOS.value.length 
                ? supportedOS.value.includes(osName) 
                : true;

            return (
                isOSCompatible &&
                Array.isArray(cluster.controlPlaneHosts) &&
                !cluster.controlPlaneHosts.some((selectedHost) => selectedHost.ip === host.hostIP) &&
                Array.isArray(cluster.workerHosts) &&
                !cluster.workerHosts.some((selectedHost) => selectedHost.ip === host.hostIP)
            );
        });
    });

    const handleRefresh = async () =>{
        fetchNodeList();
        fetchHostList();
    }

    const masterStatus = computed(() => {
        return nodeList.value && nodeList.value.some(node => node.role === 'master' && node.status === 'Unknown' && node.deploymentStatus === 'NotDeploy');
    });

    const handleAddNode = async() => {
        addNodeVisible.value = true;
        fetchHostList();
    }

    const handleAddNodeCancel = async () => {
        addNodeVisible.value = false;
    }
   
    const handleJoinOk = async () => {
        joinVisible.value = true;
        try {
            const data = {
                id : id.value,
                hosts: [node.value],
            };
            if(nodeRole.value === 'master'){
                const result: any = await deployCluster(data);
                if(result.status === 'ok'){
                    Message.info("正在安装master节点,请稍后......");
                    fetchNodeList();
                }
            }else{
                const result: any = await joinCluster(data);
                if(result.status === 'ok'){
                    Message.info("节点正在加入集群中，请稍后......");
                    fetchNodeList();
                }
            }
            
        } catch (err) {
            console.log(err);
        } finally {
            // setLoading(false);
        }
    }

    const handleJoinCancel = async () => {
        joinVisible.value = false;
    }

    const isHostExist = (hostIP) => {
      return cluster.workerHosts.some(host => host.ip === hostIP);
    };

    const addControlPlaneHost = () => {
        if (!controlPlaneHost.value || controlPlaneHost.value.length === 0) {
            Message.error("请选择控制节点主机！");
            return;
        }

        controlPlaneHost.value.forEach(selectedIP => {
            const selectedHost = hostList.value.find(host => host.hostIP === selectedIP);
            if (!selectedHost) {
                Message.error(`选择的主机 ${selectedIP} 不存在！`);
                return;
            }

            // 检查主机是否已被添加为工作节点
            if (cluster.workerHosts.some(host => host.ip === selectedIP)) {
                Message.error(`主机 ${selectedIP} 已被添加为工作节点，无法添加为控制节点！`);
                return;
            }

            const selectedHostOS = selectedHost.os.split(' ')[0]; // 获取操作系统名称
            
            // 获取所有工作节点的操作系统集合
            const workerOSSet = new Set(cluster.workerHosts.map(host => (host.os ? host.os.split(' ')[0] : '')).filter(os => os));
            
            // 如果已经选择了工作节点，检查控制节点的操作系统是否一致
            if (workerOSSet.size > 0 && !workerOSSet.has(selectedHostOS)) {
                Message.error(`控制节点 ${selectedIP} 的操作系统必须与工作节点的操作系统一致`);
                return;
            }

            // 检查是否已经添加过
            if (!cluster.controlPlaneHosts.some(host => host.ip === selectedIP)) {
                const segments = selectedHost.hostIP.split('.');
                const result = segments[2] + segments[3];
                const hostName = `master${result}`;
                cluster.controlPlaneHosts.push({ ip: selectedIP, hostName, role: 'master', os: selectedHost.os });
            }
        });
        
        // 清空选择
        controlPlaneHost.value = [];
    };

    const removeControlPlaneHost = (index) => {
        cluster.controlPlaneHosts.splice(index, 1);
    };

    
    // 添加工作节点
    const addWorkerHost = () => {
        if (!workerHost.value || workerHost.value.length === 0) {
            Message.error("请选择工作节点主机！");
            return;
        }

        // 检查主机是否已被添加为控制节点
        if (workerHost.value.some(ip => cluster.controlPlaneHosts.some(host => host.ip === ip))) {
            Message.error("选中的主机中有已被添加为控制节点的主机，无法添加为工作节点！");
            return;
        }
        
        // 获取所有工作节点的操作系统集合
        const controlPlaneOSSet = new Set(cluster.workerHosts.map(host => (host.os ? host.os.split(' ')[0] : '')).filter(os => os));


        // 检查所有选中的工作节点的操作系统是否一致
        const selectedWorkerHosts = workerHost.value.map(ip => hostList.value.find(host => host.hostIP === ip));
        if (selectedWorkerHosts.some(host => !host)) {
            Message.error("某些选中的主机不存在！");
            return;
        }
        // 遍历添加工作节点
        workerHost.value.forEach(ip => {
            if (!cluster.workerHosts.some(host => host.ip === ip)) {
                const selectedHost = hostList.value.find(host => host.hostIP === ip);
                if (!selectedHost) return; // 如果没有找到主机，跳过

                const segments = selectedHost.hostIP.split('.');
                const result = segments[2] + segments[3];
                const hostName = `node${result}`;

                cluster.workerHosts.push({ ip, hostName, role: 'node', os: selectedHost.os });
            }
        });

        workerHost.value = [];
    };

    const removeWorkerHost = (index: any) => {
        cluster.workerHosts.splice(index, 1);
    };

    const onClickJoinNode = async (record: any) => {
        if (masterStatus.value) {
            Message.warning('master节点未准备好，无法加入 node 节点！');
            return;
        }
        joinVisible.value = true;
        node.value = record;
        name.value = record.hostName;
        // console.log(node.value);
    }

    const onClickJoinMaster = async (record: any) => {
        joinVisible.value = true;
        node.value = record;
        nodeRole.value = record.role;
    }
   
    const onClickDelete = async (record: any) =>{
        if (record.role === 'master' && masterCount.value <= 1) {
            Message.warning("不能删除最后一个 master 节点！");
            return;
        }
        deleteVisible.value = true;
        nodeip.value = record.ip;
        nodeRole.value = record.role;
        name.value = record.hostName;
    }

    const onClickRemove = async (record: any) => {
        removeVisible.value = true;
        nodeip.value = record.ip
        name.value = record.hostName;
    }

    const onClickRetry = async (record: any) =>{
        try {
        const data = {
            id : id.value,
            clusterName: clusterName.value,
            version: version.value,
            ip: record.ip,
        }
        console.log(data);
        const result: any = await upgradeCluster(data);
        if(result.status === 'ok'){
            Message.info("节点正在升级,请稍后......");
            fetchNodeList();
        }
      } catch (err) {
        console.log(err);
      }

    }

    const handleDeleteOk = async () => {
        try {
            const data = {
                id : id.value,
                ip: nodeip.value
            };
            const result: any = await deleteNode(data);
            if(result.status === 'ok'){
                Message.success("节点删除成功！");
                fetchNodeList();
            }
        } catch (err) {
            console.log(err);
        }
    }

    const handleDeleteCancel = async () => {
        deleteVisible.value = false;
    }

    const handleAddNodeOk = async () => {
        
        try {
            if (cluster.controlPlaneHosts.length === 0 && cluster.workerHosts.length === 0) {
                Message.error("至少需要添加一个控制节点或一个工作节点！");
                return;
            }

            const hostNames = hosts.value.map(host => host.hostName); 
            const duplicateHostNames = hostNames.filter((name, index) => hostNames.indexOf(name) !== index);

            if (hostNames.some(name => !name)) {
                Message.error("主机名称不能为空！");
                return false;
            }

            if (duplicateHostNames.length > 0) {
                Message.error("主机名称不能重复！");
                return false;
            }

            const data = {
                id : id.value,
                hosts: [
                    ...(Array.isArray(cluster.controlPlaneHosts) ? cluster.controlPlaneHosts : []),
                    ...(Array.isArray(cluster.workerHosts) ? cluster.workerHosts : [])
                ]
            };
            const result: any = await addNode(data);
            if(result.status === 'ok'){
                Message.success("节点添加成功！");
                cluster.workerHosts = null;
                cluster.controlPlaneHosts = null;
                fetchNodeList();
            }
        } catch (err) {
            console.log(err);
        }
    }

    const handleRemoveOk = async () => {
        try {
            if(master1.value === name.value){
                Message.warning("不能移除最后一个master节点！");
                return;
            }
            const data = {
                id : id.value,
                ip: nodeip.value
            };
            const result: any = await removeNode(data);
            if(result.status === 'ok'){
                Message.info("节点正在移除中，请稍后......");
                fetchNodeList();
            }
        } catch (err) {
            console.log(err);
        } 
    }

    const handleRemoveCancel = async () => {
       removeVisible.value = false;
    }

    
    //获取离线包列表
    const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const result = await getResources();
            resourceList.value = result.data;
            resourceList.value.forEach(item => {
                if (item.name === 'repo_files') {
                    repoFiles.value = item;
                } 
            })
            
            const osList = new Set();
            repoFiles.value.children.forEach(item => {
                const osMatch = item?.name.match(/^([a-zA-Z]+)(?:[_\s-]|$)/);
                const newOS = osMatch ? osMatch[1] : 'null';

                if (newOS) {
                    osList.add(newOS);
                }
            });

            supportedOS.value = Array.from(osList);

        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    //获取集群节点列表
    const fetchNodeList = async () => {
      try {
        setLoading(true);
        const result = await getNodeList(id.value);
        nodeList.value = result.data.map(node => ({
            ...node,
            createTime: formatTime(node.createTime), 
            activeJobType: (() => {
                const typeMap = {
                    initCluster: '初始化集群',
                    addNode: '添加节点',
                    upgradeCluster: '升级集群',
                    resetCluster: '重置集群',
                    resetNode: '重置节点',
                };
                return typeMap[node.activeJobType] || '暂无任务';
            })(),
            activeStatus: (() => {
                const statusMap = {
                    running: '运行中',
                    waiting: '等待中',
                };
                return statusMap[node.activeStatus] || '暂无状态';
            })(),
        }));
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
     //获取主机列表
     const fetchHostList = async () => {
      try {
        const result = await getAvailableHostList();
        hostList.value = result.data;
      } catch (err) {
        console.log(err);
      } 
    };

    onMounted(async() => {
        await fetchHostList();
        await fetchNodeList();
        await fetchResourcesList();
        roleLogos.value['node'] = (await import('@/assets/images/logo/node.png')).default;
        roleLogos.value['master'] = (await import('@/assets/images/logo/master.png')).default;
    });

    const columns = [
    {
        title: '',
        dataIndex: 'icon',
        slotName: 'icon',
    },
    {
        title: 'IP',
        dataIndex: 'ip',
        slotName: 'ip',
    },
    {
        title: '节点名字',
        dataIndex: 'hostName',
    },
    {
        title: '节点角色',
        dataIndex: 'role',
        slotName: 'role',
    },
    {
        title: 'k8s版本',
        dataIndex: 'k8sVersion',
        slotName: 'k8sVersion',
    },
    {
        title: '状态',
        dataIndex: 'status',
        slotName: 'status',
    },
    {
        title: '任务类型',
        dataIndex: 'activeJobType',
        slotName: 'activeJobType',
    },
    {
        title: '任务状态',
        dataIndex: 'activeStatus',
        slotName: 'activeStatus',
    },
    {
        title: '上次任务类型',
        dataIndex: 'lastJobType',
        slotName: 'lastJobType',
    },
    {
        title: '上次任务状态',
        dataIndex: 'lastJobStatus',
        slotName: 'lastJobStatus',
    },
    {
        title: '加入时间',
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

    .nav-btn {
      border-color: rgb(var(--gray-2));
      color: rgb(var(--gray-8));
      font-size: 16px;
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

    .status-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }

    .status-icon.running {
        color: #52c41a; 
    }

    .status-icon.waiting {
        color: #faad14; 
    }

    .status-icon.completed {
        color: #1890ff; 
    }

    .status-text1 {
        font-size: 14px;
        color: #333;
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

</style>