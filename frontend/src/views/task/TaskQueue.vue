<template>
    <div class="container">
        <div class="layout">
            <a-card>
                <a-collapse v-model:active-key="defaultActiveKey">
                    <a-collapse-item 
                        v-for="(task) in taskList" 
                        :key="task.taskType" 
                        :header="task.taskType"> 
                        <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                            <a-button type="primary" @click="onClickBulkTermination(task.taskType)" :style="{ marginBottom: '10px', marginTop: '2px' }">
                                批量终止
                            </a-button> 
                        </div>
                        <a-table :data="task.tasks" :columns="columns" :loading="loading">
                            <template v-slot:progress="{ record }">
                                <template v-if="record.task_counts > 0">
                                    <a-progress
                                        type="circle"
                                        :percent="calculatePercent(record)"
                                    />
                                </template>
                                <template v-else>
                                    <a-progress type="circle" :percent="0" />
                                </template>
                            </template>
                            <template #status="{ record }">
                                <div class="status-container">
                                    <span v-if="record.status === '活跃中'" class="status-icon running">
                                        <icon-sync class="rotating" />
                                    </span>
                                    <span v-if="record.status === '等待中'" class="status-icon waiting">
                                        <icon-clock-circle />
                                    </span>
                                    <span class="status-text1">{{ record.status }}</span>
                                </div>
                            </template>
                            <template #operations="{ record }">
                                <a-button v-if="record.status === '活跃中'" type="text" size="small" @click="onClickDetail(record)">
                                    详情
                                </a-button>
                                <a-button v-if="record.status === '活跃中'" type="text" size="small" @click="onClickStop(record)">
                                    终止
                                </a-button>
                                <a-button v-if="record.status === '等待中'" type="text" size="small" @click="onClickDelete(record)">
                                    删除
                                </a-button>
                            </template>
                        </a-table>
                    </a-collapse-item>
                </a-collapse>
            </a-card>
            <a-modal
                v-model:visible="webSocketVisible"
                title="任务实例"
                @ok="handleWebSocketOk"
                @cancel="handleWebSocketCancel"
                :footer="null"
                :width="modalWidth"
                :style="{ height: modalHeight + 'px' }"
                :body-style="{
                    overflowY: 'auto', 
                    overflowX: 'auto',
                    margin: '0', 
                    padding: '0', 
                    backgroundColor: 'black', 
                    color: 'white' 
                }"
            >
                <div ref="webSocketContent" id="webSocketContent"></div>
            </a-modal>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted, nextTick, onBeforeUnmount, onUnmounted } from 'vue';
    import useLoading from '@/hooks/loading';
    import { stopTask, stopTasks, removeWaitingTask } from '@/api/tasks';
    import { useRoute } from 'vue-router';
    import { Message } from '@arco-design/web-vue';
    import { formatTime } from '@/utils/time';

    const route = useRoute();
    const id = ref(route.query.id);
    const { loading, setLoading } = useLoading();
    const taskList = ref<any>();
    const webSocketVisible = ref(false);
    const version = ref();
    const upgradeVersion = ref();
    const webSocketContent = ref<HTMLElement | null>(null);
    const defaultActiveKey = ref();
    const socket1 = ref(null);
    const socket2 = ref(null);
    const modalWidth = ref(window.innerWidth * 0.6);
    const modalHeight = ref(window.innerHeight * 1); 
    const nodeVersion = ref();

    version.value = route.query.version;

    const props = defineProps({
        upgradeK8sVersion: String,
    })

    const onClickDetail = (record: any) => {
        webSocketVisible.value = true; 
        nodeVersion.value = record.k8sVersion;
        openWebSocketModal(record);
    };

    const getFirstK8sVersionFromStorage = (key = 'k8sVersionList'): string => {
        const versionArrayStr = localStorage.getItem(key);
        if (versionArrayStr) {
            try {
                const versionArray = JSON.parse(versionArrayStr);
                if (Array.isArray(versionArray) && versionArray.length > 0) {
                    return versionArray[0]; // 返回第一个版本
                }
            } catch (parseError) {
                console.error('版本信息解析失败:', parseError);
            }
        }
        return '';
    };

    const extractMajorMinor = (version: string)=> {
        if(version){
            const match = version.match(/(v?\d+\.\d+)/);
            return match ? match[1] : '';
        }
    }

    const getMappedK8sVersion = (version: string)=> {
        try {
            const majorMinor = extractMajorMinor(version); 
            if (!majorMinor) return '';

            const versionMapStr = localStorage.getItem('k8sVersionMap');
            if (!versionMapStr) return '';
            
            const versionMap: Record<string, string> = JSON.parse(versionMapStr);
            
            return versionMap[majorMinor] || '';
        } catch (err) {
            console.error('解析版本映射失败:', err);
            return '';
        }
    }

    const calculatePercent = (record: any): number => {
        
        const current = Number(record.current_task)
        const total = Number(record.task_counts)
        const percent = Number(((current / total)).toFixed(2))
        if (record.status === '活跃中' && percent >= 1.0) {
            return 0.99
        }
      
        return percent
    }

    const onClickBulkTermination = async (taskname: any) => {
        console.log(taskname);
        
        try {
            setLoading(true);
            const taskNameMap: Record<string, string> = {
                '添加节点': 'addNode',
                '初始化集群': 'initCluster',
                '重置集群': 'resetCluster',
                '重置节点': 'resetNode',
                '升级集群': 'upgradeCluster',
            };
            const taskName = taskNameMap[taskname];
            const data = {
                id: id.value,
                taskName,
            };
            // const k8sVersion = getFirstK8sVersionFromStorage();
            let k8sVersion;
            if(taskname === '升级集群' && props.upgradeK8sVersion){
                k8sVersion = getMappedK8sVersion(props.upgradeK8sVersion)
            }else{
                k8sVersion = getMappedK8sVersion(version.value);
            }
            const result: any = await stopTasks(data, k8sVersion);
            if(result.status === 'ok'){
                Message.success("任务已终止！");
                connectWebSocket(id.value);
            }else{
                Message.error(result.msg);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    }

    const onClickDelete = async (record: any) => {
        try {
            setLoading(true);
            const taskNameMap: Record<string, string> = {
                '初始化集群': 'initCluster',
                '添加节点': 'addNode',
                '升级集群': 'upgradeCluster',
                '重置集群': 'resetCluster',
                '重置节点': 'resetNode',
            };
            const taskName = taskNameMap[record.taskName];
            const data = {
                id: id.value,
                jobId: record.jobId,
                taskName,
            };
            let k8sVersion;
            if(record.taskName === '升级集群' && props.upgradeK8sVersion){
                k8sVersion = getMappedK8sVersion(props.upgradeK8sVersion)
            }else{
                k8sVersion = getMappedK8sVersion(version.value);
            }
            const result: any = await removeWaitingTask(data, k8sVersion);
            if(result.status === 'ok'){
                Message.success("任务已删除！");
                connectWebSocket(id.value);
            }else{
                Message.error(result.msg);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    }

    const onClickStop = async (record: any) => {
        try {
            setLoading(true);
            const taskNameMap: Record<string, string> = {
                '初始化集群': 'initCluster',
                '添加节点': 'addNode',
                '升级集群': 'upgradeCluster',
                '重置集群': 'resetCluster',
                '重置节点': 'resetNode',
            };
            const taskName = taskNameMap[record.taskName];
            const data = {
                id: id.value,
                jobId: record.jobId,
                taskName,
            };
            // const k8sVersion = getFirstK8sVersionFromStorage();
            // const k8sVersion = getMappedK8sVersion(version.value);
            let k8sVersion;
            if(record.taskName === '升级集群' && props.upgradeK8sVersion){
                k8sVersion = getMappedK8sVersion(props.upgradeK8sVersion)
            }else{
                k8sVersion = getMappedK8sVersion(version.value);
            }
            const result: any = await stopTask(data, k8sVersion);
            if(result.status === 'ok'){
                Message.success("任务已终止！");
                connectWebSocket(id.value);
            }else{
                Message.error(result.msg);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const createWebSocket = (url, onMessage) => {
    const socket = new WebSocket(url);

    socket.onopen = () => {
        console.log('WebSocket connection opened');
    };

    socket.onmessage = onMessage;

    socket.onerror = (error) => {
        console.error('WebSocket error', error);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
    };

    return socket;
    };

    // 获取详情
    const openWebSocketModal = async (task) => {
    webSocketVisible.value = true;
    // const socketUrl = `ws://10.1.35.91:8000/websocket/${id.value}/${task.ip}/${task.timestamp}`;
    let k8sVersion: any;
    if(task.taskName === '升级集群' && props.upgradeK8sVersion){
      k8sVersion = getMappedK8sVersion(props.upgradeK8sVersion);
    }else{
      k8sVersion = getMappedK8sVersion(nodeVersion.value);  
    }
    console.log(k8sVersion);
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const socketUrl = `${protocol}${window.location.host}/${k8sVersion}/ws/websocket/${id.value}/${task.ip}/${task.timestamp}`;

    socket1.value = createWebSocket(socketUrl, (event) => {
        if (webSocketContent.value) {
        webSocketContent.value.innerHTML += `<pre>${event.data}</pre>`;
        nextTick(() => {
            if (!isUserScrolling.value) {
            webSocketContent.value.scrollTop = webSocketContent.value.scrollHeight;
            }
        });
        }
    });

    const isUserScrolling = ref(false);

    const handleScroll = () => {
        if (webSocketContent.value) {
        const { scrollTop, scrollHeight, clientHeight } = webSocketContent.value;
        isUserScrolling.value = !(scrollTop + clientHeight >= scrollHeight - 10);
        }
    };

    onMounted(() => {
        if (webSocketContent.value) {
        webSocketContent.value.addEventListener("scroll", handleScroll);
        }
    });

    onUnmounted(() => {
        if (webSocketContent.value) {
        webSocketContent.value.removeEventListener("scroll", handleScroll);
        }
    });
    };

    const handleWebSocketOk = () => {
    webSocketVisible.value = false;
    };

    const handleWebSocketCancel = () => {
    webSocketVisible.value = false;
    if (socket1.value) {
        socket1.value.close();
    }
    };

    // 获取列表
    const connectWebSocket = (id) => {
        // socket2.value = createWebSocket(`ws://10.1.35.91:8000/activeTasks/${id}`, (event) => {
        //    handleTaskListMessage(event.data);
        // });
        let k8sVersion: any;
        if(props.upgradeK8sVersion){
            k8sVersion = getMappedK8sVersion(props.upgradeK8sVersion);
        }else{
            k8sVersion = getMappedK8sVersion(version.value);  
        }
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        socket2.value = createWebSocket(`${protocol}${window.location.host}/${k8sVersion}/ws/activeTasks/${id}`, (event) => {
          handleTaskListMessage(event.data);
        });
    };

    const handleTaskListMessage = (data) => {
    try {
        const result = JSON.parse(data);
        if (result && typeof result === 'object') {
        const typeOrder = ['initCluster', 'addNode', 'upgradeCluster', 'resetCluster', 'resetNode'];
        const typeMap = {
            initCluster: '初始化集群',
            addNode: '添加节点',
            upgradeCluster: '升级集群',
            resetCluster: '重置集群',
            resetNode: '重置节点',
        };

        taskList.value = Object.entries(result).map(([key, tasks]) => ({
            taskKey: key,
            taskType: typeMap[key] || key,
            tasks: Array.isArray(tasks)
            ? tasks.map(task => ({
                ...task,
                progress: ((Number(task.current_task) / Number(task.task_counts)) * 100),
                createTime: formatTime(task.timestamp),
                status: getStatus(task.status),
                taskName: typeMap[task.taskName] || task.taskName,
                }))
            : [],
        })).sort((a, b) => typeOrder.indexOf(a.taskKey) - typeOrder.indexOf(b.taskKey));

        defaultActiveKey.value = taskList.value
            .filter(task => task.tasks.length > 0)
            .map(task => task.taskType);
        }
    } catch (err) {
        console.error('Error processing task list:', err);
    }
    };

    const getStatus = (status) => {
    const statusMap = {
        running: '活跃中',
        waiting: '等待中',
        failed: '失败',
        completed: '完成',
    };
    return statusMap[status] || '未知';
    };

    onMounted(() => {
    connectWebSocket(id.value);
    window.addEventListener('resize', updateModalSize);
    });

    onBeforeUnmount(() => {
    window.removeEventListener('resize', updateModalSize);
    if (socket2.value) {
        socket2.value.close();
    }
    });

    const updateModalSize = () => {
    modalWidth.value = window.innerWidth * 0.6;
    modalHeight.value = window.innerHeight * 0.8;
    };

    onBeforeUnmount(() => {
    if (socket1.value) {
        socket1.value.close();
    }
    });

    const columns = [
        { title: 'IP', dataIndex: 'ip' },
        { title: '名称', dataIndex: 'taskName' },
        { title: '角色', dataIndex: 'role' },
        { title: '创建时间', dataIndex: 'createTime' },
        { title: '任务状态', dataIndex: 'status' , slotName: 'status',},
        { title: '任务进度', dataIndex: 'progress' , slotName: 'progress',},
        { title: '操作', dataIndex: 'operations', slotName: 'operations',},
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

    #webSocketContent {
        height: calc(100vh - 200px); /* 根据需要调整高度，以确保模态框有足够的可用高度 */
        overflow-y: auto; // 允许垂直滚动
        padding: 20px; 
        margin: 0; 
        color: white;
        background-color: black;
        font-family: monospace;
    }

    .nav-btn {
        border-color: rgb(var(--gray-2));
        color: rgb(var(--gray-8));
        font-size: 16px;
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
