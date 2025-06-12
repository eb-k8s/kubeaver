<template>
    <div class="container">
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
                        <icon-refresh />
                    </a-button>
                </div>
                <a-table :data="formattedTasks" :columns="columns" :loading="loading">
                    <template #status="{ record }">
                        <div class="status-container">
                            <span v-if="record.status === '活跃中'" class="status-icon working">
                                <icon-sync class="rotating" />
                            </span>
                            <span v-if="record.status === '已完成'" class="status-icon worked">
                                <icon-check-circle />
                            </span>
                            <span v-if="record.status === '失败'" class="status-icon failed">
                                <icon-close-circle />
                            </span>
                            <span class="status-text1">{{ record.status }}</span>
                        </div>
                    </template>
                    <template #operations="{ record }">
                        <a-button type="text" size="small" @click="onClickDetail(record)">
                            详情
                        </a-button>
                        <a-button type="text" size="small" @click="onClickDetailTime(record)">
                            时间统计
                        </a-button>
                    </template>
                </a-table>
            </a-card>
            <a-modal
                v-model:visible="webTaskDetailVisible"
                title="任务实例"
                @ok="handleTaskDetailOk"
                @cancel="handleTaskDetailCancel"
                :footer="null"
                width="60%"
                height="100%"
                :body-style="{ 
                    overflowY: 'auto', 
                    overflowX: 'auto',
                    margin: '0', 
                    padding: '0', 
                    backgroundColor: 'black', 
                    color: 'white' 
                }"
            >
                <div
                    id="TaskContent"
                    ref="TaskContent"
                    v-html="TaskHtmlContent"
                    class="TaskContent"
                ></div>
            </a-modal>
            <a-modal
                v-model:visible="detailTimeVisible"
                @ok="handleDetailTimeOk"
                @cancel="handleDetailTimeCancel"
                :footer="null"
                width="40%"
            >
                <div ref="chartContainer" style="height: 400px; width: 100%;"></div>
            </a-modal>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue';
import useLoading from '@/hooks/loading';
import { getTaskList, getTaskDetail } from '@/api/tasks';
import { useRoute } from 'vue-router';
import { formatTime } from '@/utils/time';
import * as echarts from 'echarts';
import { Message } from '@arco-design/web-vue';

const route = useRoute();
const id = ref(route.query.id);
const { loading, setLoading } = useLoading();
const taskList = ref<{ hosts: string[], tasks: any[] }>({ hosts: [], tasks: [] });
const webTaskDetailVisible = ref(false);
const detailTimeVisible = ref(false);
const TaskContent = ref<HTMLElement | null>(null);
const TaskHtmlContent = ref<string>('');
const formattedTasks = ref();
let socket: WebSocket | null = null;
const chartContainer = ref(null); 
const chartInstance = ref(null); 

const modalWidth = ref(window.innerWidth * 0.6); 
const modalHeight = ref(window.innerHeight * 1); 

const onClickDetailTime = (record) => {
    detailTimeVisible.value = true;
    nextTick(() => {
        drawChart(record.statistics);
    });
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

const drawChart = (data) => {
    const nameTranslation = {
        "reset": "重置",
        "pre_process": "预处理",
        "download": "安装准备",
        "install k8s cluster": "安装master",
        "install network_plugin": "安装网络插件",
        "add to cluster": "加入集群",
        "after_check": "集群检查",
        "upgrade master components": "升级master",
        "upgrade network_plugin": "升级网络插件",
        "upgrade node components": "升级node",
    };

    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.error('数据格式不正确，无法解析为 JSON 对象', e);
            return;
        }
    }

    if (!Array.isArray(data)) {
        console.error('数据格式不正确，期望为数组');
        return;
    }

    data = data
        .filter(item => item.name && item.time !== undefined)
        .map(item => ({
            name: nameTranslation[item.name] || item.name,
            time: Math.ceil(item.time * 100) / 100,
        }));

    nextTick(() => {
        if (chartContainer.value && !chartInstance.value) {
            chartInstance.value = echarts.init(chartContainer.value);
        }

        const isSingleDataPoint = data.length === 1;

        const option = {
            title: { text: '时间统计', left: 'center' },
            tooltip: {
                trigger: 'item',
                formatter: ({ name, value }) => `${name}: ${value.toFixed(2)} 秒`,
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: isSingleDataPoint ? '30%' : '15%',
                top: '15%',
            },
            xAxis: {
                type: 'category',
                data: data.map(item => item.name),
                axisLabel: {
                    rotate: isSingleDataPoint ? 0 : 30,
                },
                axisTick: {
                    alignWithLabel: true,
                },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: value => `${value.toFixed(2)} 秒`,
                },
            },
            series: [
                {
                    type: 'bar',
                    barWidth: isSingleDataPoint ? '10%' : '50%',
                    data: data.map((item, index) => ({
                        value: item.time,
                        itemStyle: {
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 0,
                                y2: 1,
                                colorStops: [
                                    { offset: 0, color: macaronsGradient[index % macaronsGradient.length].start },
                                    { offset: 1, color: macaronsGradient[index % macaronsGradient.length].end },
                                ],
                            },
                        },
                    })),
                    label: {
                        show: true,
                        position: 'top',
                        formatter: ({ value }) => `${value.toFixed(2)} 秒`,
                    },
                },
            ],
        };

        chartInstance.value.setOption(option);
        chartInstance.value.resize();
    });
};

const macaronsGradient = [
    { start: '#f7bba9', end: '#f78ca9' }, // 浅粉 -> 桃粉
    { start: '#f9dd94', end: '#f7c472' }, // 浅黄 -> 柔黄
    { start: '#a5d6a7', end: '#80cbc4' }, // 浅绿 -> 薄荷绿
    { start: '#90caf9', end: '#64b5f6' }, // 浅蓝 -> 天蓝
    { start: '#ce93d8', end: '#ab47bc' }, // 浅紫 -> 淡紫
    { start: '#ffcc80', end: '#ffa726' }, // 浅橙 -> 柔橙
    { start: '#ffab91', end: '#ff7043' }, // 浅珊瑚 -> 珊瑚
    { start: '#d4e157', end: '#c0ca33' }, // 浅青绿 -> 青绿
];


const onClickDetail = (record: any) => {
    webTaskDetailVisible.value = true; 
    handleTaskDetail(record);
};

const handleRefresh = async () =>{
    fetchTaskList();
}

const handleTaskDetailOk = () => {
    webTaskDetailVisible.value = false;
};

const handleTaskDetailCancel = () => {
    webTaskDetailVisible.value = false;
};

const handleDetailTimeOk = () => {
    detailTimeVisible.value = true; 
};

// 弹窗关闭后清理图表实例
const handleDetailTimeCancel = () => {
    detailTimeVisible.value = false;

    // 防止内存泄漏，清理图表实例
    if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
    }
};

const handleTaskDetail = async (task: any) => {
    webTaskDetailVisible.value = true;

    try {
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }

        const taskNameMap: Record<string, string> = {
            '添加节点': 'addNode',
            '初始化集群': 'initCluster',
            '重置集群': 'resetCluster',
            '重置节点': 'resetNode',
            '升级集群': 'upgradeCluster',
        };

        const taskName = taskNameMap[task.taskName] || task.taskName;

        const k8sVersion = getFirstK8sVersionFromStorage();
        const result: any = await getTaskDetail(id.value, task.IP, task.timestamp, taskName, k8sVersion);
        const rawContent = result.data || '';

        // 匹配所有的 play
        const plays = rawContent.split('\n\n').filter((msg) => msg.trim().startsWith('PLAY'));

        // 根据任务名称选择对应的任务处理逻辑
        if (task.taskName === '初始化集群') {
            processClusterInitialization(plays, task, rawContent);
        } else if (task.taskName === '添加节点') {
            processAddNode(plays, task, rawContent);
        }
        else if (task.taskName === '升级集群') {
            processClusterUpgrade(plays, task, rawContent);
        }
        else if (task.taskName === '重置节点') {
            processNodeReset(plays, task, rawContent);
        }
        else if (task.taskName === '重置集群') {
            processClusterReset(plays, task, rawContent);
        }
        // 其他任务可以在这里继续扩展
    } catch (error) {
        console.error('Error fetching task detail:', error);
    }
};

// 处理初始化集群任务
const processClusterInitialization = (plays, task, rawContent) => {
    const playStages = {
        'force delete node': '重置阶段',
        'prepare for using kubespray playbook': '预处理阶段',
        'Prepare for etcd install': '安装准备阶段',
        'Install etcd': '安装master节点阶段',
        'Invoke kubeadm and install a CNI': '安装网络插件阶段',
        'Patch Kubernetes for Windows': '安装后检查阶段',
    };

    const stageToTimeMapping = {
        '重置阶段': 'reset',
        '预处理阶段': 'pre_process',
        '安装准备阶段': 'download',
        '安装master节点阶段': 'install k8s cluster',
        '安装网络插件阶段': 'install network_plugin',
        '安装后检查阶段': 'after_check',
    };

    processPlayStages(plays, task, rawContent, playStages, stageToTimeMapping);
};

// 处理添加节点任务
const processAddNode = (plays, task, rawContent) => {
    const playStages = {
        'force delete node': '重置阶段',
        'prepare for using kubespray playbook': '预处理阶段',
        'Target only workers to get kubelet installed and checking in on any new nodes(engine)': '安装准备阶段',
        'Target only workers to get kubelet installed and checking in on any new nodes(node)': '安装node阶段',
        'Target only workers to get kubelet installed and checking in on any new nodes(network)': '安装网络插件阶段',
        'Apply resolv.conf changes now that cluster DNS is up': '集群检查阶段',
    };

    const stageToTimeMapping = {
        '重置阶段': 'reset',
        '预处理阶段': 'pre_process',
        '安装准备阶段': 'download',
        '安装node阶段': 'add to cluster',
        '安装网络插件阶段': 'install network_plugin',
        '集群检查阶段': 'after_check',
    };

    processPlayStages(plays, task, rawContent, playStages, stageToTimeMapping);
};

// 处理更新集群任务
const processClusterUpgrade = (plays, task, rawContent) => {
    const playStages = {
        'Check Ansible version': '升级准备阶段',
        'Upgrade container engine on non-cluster nodes': '升级master节点阶段',
        'Upgrade calico and external cloud provider on all masters, calico-rrs, and nodes': '升级网络插件',
        'Finally handle worker upgrades, based on given batch size': '升级node节点阶段',
        'Patch Kubernetes for Windows': '集群检查阶段',
    };

    const stageToTimeMapping = {
        '升级准备阶段': 'pre_process',
        '升级master节点阶段': 'upgrade master components',
        '升级网络插件': 'upgrade network_plugin',
        '升级node节点阶段': 'upgrade node components',
        '集群检查阶段': 'after_check'
    };

    processPlayStages(plays, task, rawContent, playStages, stageToTimeMapping);
};

// 处理重置集群任务
const processClusterReset = (plays, task, rawContent) => {
    const playStages = {
        'force delete node': '重置阶段',
    };

    const stageToTimeMapping = {
        '重置阶段': 'reset',
    };

    processPlayStages(plays, task, rawContent, playStages, stageToTimeMapping);
};

// 处理重置节点任务
const processNodeReset = (plays, task, rawContent) => {
    const playStages = {
        'force delete node': '重置阶段',
    };

    const stageToTimeMapping = {
        '重置阶段': 'reset',
    };

    processPlayStages(plays, task, rawContent, playStages, stageToTimeMapping);
};

// 处理任务阶段
const processPlayStages = (plays, task, rawContent, playStages, stageToTimeMapping) => {
    function getStageTime(stageName) {
        const taskName = stageToTimeMapping[stageName];
        if (taskName && Array.isArray(task.statistics)) {
            const stageData = task.statistics.find(item => item.name === taskName);
            return stageData ? stageData.time : 0;
        }
        return 0;
    }

    function getRoundedStageTime(title) {
        const time = getStageTime(title);
        return Math.ceil(time * 100) / 100; // 保留两位小数
    }

    let htmlContent = '';
    let currentStageContent = '';
    let currentStageTitle = '未知阶段'; // 当前阶段标题
    let currentStageStatus = 'pending'; // 当前阶段的默认状态
    let processedStages = new Set(); // 用于存储已处理的阶段，避免重复处理

    for (let i = 0; i < plays.length; i++) {
        const currentPlay = plays[i];
        const nextPlay = plays[i + 1];

        const currentPlayLines = currentPlay.split('\n');
        const playSummary = currentPlayLines[0] || currentPlayLines[1];
        const currentPlayContent = currentPlayLines[0]
            ? currentPlayLines.slice(1).join('\n')
            : currentPlayLines.slice(2).join('\n');

        let aggregatedContent = currentPlayContent;

        if (nextPlay) {
            const nextPlayIndex = rawContent.indexOf(nextPlay);
            const currentPlayIndex = rawContent.indexOf(currentPlay);
            const contentBetweenPlays = rawContent.slice(
                currentPlayIndex + currentPlay.length,
                nextPlayIndex
            );
            aggregatedContent += '\n' + contentBetweenPlays.trim();
        } else {
            const currentPlayIndex = rawContent.indexOf(currentPlay);
            aggregatedContent += '\n' + rawContent.slice(currentPlayIndex + currentPlay.length).trim();
        }

        const stageName = Object.keys(playStages).find(stage => playSummary.includes(stage));
        if (stageName) {
            // 检查阶段是否已经处理过，防止重复渲染
            if (processedStages.has(playStages[stageName])) {
                continue; // 如果已经处理过，跳过当前阶段
            }

            // 在切换到新阶段时，结束当前阶段的渲染并记录状态
            if (currentStageContent) {
                htmlContent +=  
                    `<details style="margin-bottom: 16px;">
                        <summary>
                            <span style="color: ${
                                currentStageStatus === 'success' ? 'green' : 
                                currentStageStatus === 'failure' ? 'red' : 'orange'
                            }; margin-left: 8px;">
                                ${
                                    currentStageStatus === 'success'
                                    ? '✔️' 
                                    : currentStageStatus === 'failure'
                                    ? '❌'
                                    : '<span class="spinning-icon">⏳</span>'
                                }
                            </span>
                            ${currentStageTitle}
                            <span style="float: right; font-size: 1.1em; color: white;">
                                ${getRoundedStageTime(currentStageTitle)}s
                            </span>
                        </summary>
                        ${currentStageContent}
                    </details>`;
            }

            // 切换到新的阶段
            currentStageTitle = playStages[stageName];
            currentStageContent = '';
            currentStageStatus = 'pending'; // 初始化新阶段状态为“执行中”
            processedStages.add(playStages[stageName]); // 将当前阶段标记为已处理
        }

        // 在当前阶段检查错误信息
        if (aggregatedContent.includes('Task execution failed')) {
            currentStageStatus = 'failure';
        } else if (task.status === '已完成') {
            currentStageStatus = 'success';
        } else if (!nextPlay || !Object.keys(playStages).some(stage => nextPlay.includes(stage))) {
            currentStageStatus = 'pending';
        } else {
            currentStageStatus = 'success';
        }

        aggregatedContent = aggregatedContent
            .split('\n')
            .map(line => '  ' + line)
            .join('\n');

        currentStageContent +=  
            `<div style="margin-left: 16px;">
                <details style="margin-bottom: 16px;">
                    <summary>${playSummary}</summary>
                    <pre>${aggregatedContent}</pre>
                </details>
            </div>`;
    }

    // 完成最后一个阶段
    if (currentStageContent) {
        htmlContent +=  
            `<details style="margin-bottom: 16px;">
                <summary>
                    <span style="color: ${
                        currentStageStatus === 'success' ? 'green' : 
                        currentStageStatus === 'failure' ? 'red' : 'orange'
                    }; margin-left: 8px;">
                        ${
                            currentStageStatus === 'success'
                            ? '✔️ '
                            : currentStageStatus === 'failure'
                            ? '❌'
                            : '<span class="spinning-icon">⏳</span>'
                        }
                    </span>
                    ${currentStageTitle}
                    <span style="float: right; font-size: 1.1em; color: white;">
                        ${getRoundedStageTime(currentStageTitle)}s
                    </span>
                </summary>
                ${currentStageContent}
            </details>`;
    }

    TaskHtmlContent.value = htmlContent;

    nextTick(() => {
        if (TaskContent.value) {
            TaskContent.value.scrollTop = TaskContent.value.scrollHeight;
        }
    });
};

onBeforeUnmount(() => {
    if (socket) {
        socket.close();
    }
});


function calculateExecutionTime(processedOn, finishedOn) {

    if (isNaN(processedOn) || isNaN(finishedOn)) {
        return "0秒"; 
    }

    let timeDifference = finishedOn - processedOn;

    if (timeDifference < 0) {
        return "0秒";
    }

    const seconds = Math.floor((timeDifference / 1000) % 60);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));

    let result = '';

    if (hours > 0) {
        result += `${hours}小时 `;
    }
    if (minutes > 0) {
        result += `${minutes}分钟 `;
    }
    if (seconds > 0 || result === '') { 
        result += `${seconds}秒`;
    }
    return result.trim();
}

const fetchTaskList = async () => {
    try {
        // 检查次版本是否存在
        const versionMapStr = localStorage.getItem('k8sVersionMap');
        if (!versionMapStr) {
            Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
            return;
        }
            
        setLoading(true);
        const k8sVersion = getFirstK8sVersionFromStorage();
        const result = await getTaskList(id.value, k8sVersion);
        taskList.value = result.data;

        const allTasks: any[] = [];

        taskList.value.tasks.forEach(entry => {
            Object.keys(entry).forEach(key => {
                if (key === 'ip') return;
                entry[key].forEach(data => {
                    const statusMap = {
                        'working': '活跃中', 
                        'worked': '已完成',
                        'failed': '失败'  
                    };
                    const typeMap = {
                        addNode: '添加节点',
                        initCluster: '初始化集群',
                        resetCluster: '重置集群',
                        resetNode: '重置节点',
                        upgradeCluster: '升级集群'
                    };
                    allTasks.push({
                        taskName: typeMap[key], 
                        status: statusMap[data.status] ,
                        createTime: formatTime(data.task), 
                        timestamp: data.task, 
                        executionTime: calculateExecutionTime(data.processedOn, data.finishedOn),
                        IP: entry.ip,
                        statistics: Array.isArray(data.statistics) ? data.statistics : [],
                    });
                });
            });
        });
      
        allTasks.sort((a: any, b: any) => {
            return Number(b.timestamp) - Number(a.timestamp);
        });

        formattedTasks.value = allTasks;

    } catch (err) {
        console.log(err);
    } finally {
        setLoading(false);
    }
};

onMounted(() => {
    fetchTaskList();
    window.addEventListener('resize', updateModalSize);
    window.addEventListener('resize', () => {
    if (chartInstance.value) {
        chartInstance.value.resize();
    }
});
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateModalSize);
});

// 更新模态框的大小
const updateModalSize = () => {
    modalWidth.value = window.innerWidth * 0.6;
    modalHeight.value = window.innerHeight * 0.8;
};

const columns = [
    { title: 'IP', dataIndex: 'IP' },
    { title: '名称', dataIndex: 'taskName' },
    { title: '创建时间', dataIndex: 'createTime' },
    { title: '任务状态', dataIndex: 'status', slotName: 'status' },
    { title: '执行时间', dataIndex: 'executionTime' },
    { title: '操作', dataIndex: 'operations', slotName: 'operations'},
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

    .TaskContent {
        height: calc(100vh - 200px);
        overflow-y: auto;
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

    .status-icon.working {
        color: #52c41a; 
    }

    .status-icon.worked {
        color: #6cadeb; 
    }

    .status-icon.failed {
        color: #a81919; 
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

    #chart-container {
        width: 100%;
        height: 400px;
        min-height: 400px;
    }

    @keyframes spinReverse {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .spinning-icon {
        display: inline-block;
        animation: spinReverse 1s linear infinite; /* 确保动画正确应用 */
        font-size: 1.5em; /* 确保图标的大小合适 */
    }


</style>
