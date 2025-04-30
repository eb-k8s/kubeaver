<template>
    <div class="container">
        <a-breadcrumb :style="{fontSize: '14px', marginTop: '16px', marginBottom: '16px'}">
        <a-breadcrumb-item>
            <icon-apps />
        </a-breadcrumb-item>
            <a-breadcrumb-item>集群管理</a-breadcrumb-item>
            <a-breadcrumb-item>编辑</a-breadcrumb-item>
        </a-breadcrumb>
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button type="primary" size="small" @click="handleEditCluster">保存</a-button>
                </div>
                <a-form :model="cluster" style="margin-top: 20px;">
                    <a-row :gutter="[24, 24]">
                        <a-col :xs="24" :md="12">
                            <a-card title="基础信息" style="position: relative;">
                                <a-form-item
                                    label="集群名称："
                                    field="clusterName"
                                    style="display: flex; align-items: center;"
                                    :rules="[{ required: true, message: '请输入集群名称' }]"
                                >
                                    <a-input
                                    v-model="cluster.clusterName"
                                    placeholder="请输入集群名称"
                                    style="width: 40% !important;"
                                    />
                                </a-form-item>


                                <a-form-item
                                    label="集群版本："
                                    field="version"
                                    :rules="[{ required: true, message: '请选择集群版本' }]"
                                >
                                    <a-select
                                        v-model="cluster.version"
                                        placeholder="请选择集群版本"
                                        style="width: 65%;"
                                    >
                                        <a-option
                                            v-for="version in k8sCache?.children || []"
                                            :key="version.name"
                                            :value="version.name"
                                        >
                                            {{ version.name }}
                                        </a-option>
                                    </a-select>
                                </a-form-item>
                        
                                <a-form-item
                                    label="网络插件："
                                    field="networkPlugin"
                                    :rules="[{ required: true, message: '请选择网络插件' }]"
                                >
                                    <a-select
                                        v-model="cluster.networkPlugin"
                                        class="select-input"
                                        placeholder="请选择网络插件"
                                        style="width: 50%;"
                                    >
                                        <a-option
                                            v-for="plugin in formattedPlugins" :key="plugin.name + plugin.version"
                                        >
                                            {{`${plugin.name} - ${plugin.version}`}}
                                        </a-option>
                                    </a-select>
                                </a-form-item>
                        
                                <a-form-item
                                    label="并发："
                                    tooltip="请输入任务并行的数量，必须输入整数，且最小为2，最大为10。"
                                    field="taskNum"
                                    :rules="[{ required: true, type: 'number', message: '请输入1-10之间的整数', min: 2, max: 10 }]">
                                    <a-input-number
                                        v-model="cluster.taskNum"
                                        placeholder="任务并发数量"
                                        style="width: 40% !important; color: #000000;"
                                        :min="2"
                                        :max="10"
                                    />
                                </a-form-item>
                            </a-card>
                            <a-collapse :default-active-key="[]" style="margin-top: 20px;">
                                <a-collapse-item header="参数配置" key="1">
                                    <a-card style="margin-top: -10px; margin-bottom: -10px; margin-left: -40px; margin-right:-40px;">
                                        <a-tabs default-active-key="1">
                                            <a-tab-pane key="1" title="资源预留">
                                                <a-form :model="config"  style="margin-top: 20px;">
                                                    <a-form-item label="启用k8s资源预留:">
                                                        <a-switch v-model="config.kube_reserved" disabled/>
                                                    </a-form-item>
                                                    <template v-if="config.kube_reserved">
                                                        <a-form-item label="内存: ">
                                                            <a-input v-model="config.kube_memory_reserved" placeholder="如：256Mi" style="width: 70%;" readonly/>
                                                        </a-form-item>
                                                        <a-form-item label="CPU: ">
                                                            <a-input v-model="config.kube_cpu_reserved" placeholder="如：100m" style="width: 70%;" readonly/>
                                                        </a-form-item>
                                                    </template>

                                                    <!-- 系统资源预留 -->
                                                    <a-form-item label="启用系统资源预留: ">
                                                        <a-switch v-model="config.system_reserved" disabled/>
                                                    </a-form-item>
                                                    <template v-if="config.system_reserved">
                                                        <a-form-item label="内存: ">
                                                            <a-input v-model="config.system_memory_reserved" placeholder="如：512Mi" style="width: 70%;" readonly/>
                                                        </a-form-item>
                                                        <a-form-item label="CPU: ">
                                                            <a-input v-model="config.system_cpu_reserved" placeholder="如：500m" style="width: 70%;" readonly/>
                                                        </a-form-item>
                                                    </template>
                                                </a-form>
                                            </a-tab-pane>
                                        
                                            <a-tab-pane key="2" title="域名解析">
                                                <a-form :model="config" style="margin-top: 20px;">
                                                            <a-form-item label="DNS模式: ">
                                                                <a-select v-model="config.dns_mode" style="width: 60%" disabled>
                                                                    <a-option :value=config.dns_mode>{{config.dns_mode}}</a-option>
                                                                </a-select>
                                                            </a-form-item>
                                                    
                                                        <a-form-item label="启用本地DNS: ">
                                                            <a-switch v-model="config.enable_nodelocaldns" disabled/>
                                                        </a-form-item>
                                                
                                                        <a-form-item label="启用本地DNS二级: ">
                                                            <a-switch v-model="config.enable_nodelocaldns_secondary" disabled/>
                                                        </a-form-item>
                                                    <!-- 
                                                        <a-form-item label="本地DNS IP">
                                                        <a-input v-model="config.nodelocaldns_ip" style="width: 60%" placeholder="169.254.25.10"  readonly/>
                                                        </a-form-item>
                                                    
                                                        <a-form-item label="本地DNS健康检查端口">
                                                        <a-input-number v-model="config.nodelocaldns_health_port" style="width: 60%" readonly/>
                                                        </a-form-item>
                                                    
                                                        <a-form-item label="第二健康检查端口">
                                                        <a-input-number v-model="config.nodelocaldns_second_health_port" style="width: 60%" readonly/>
                                                        </a-form-item>
                                                    
                                                        <a-form-item label="绑定主机 IP">
                                                        <a-switch v-model="config.nodelocaldns_bind_metrics_host_ip" disabled/>
                                                        </a-form-item>
                                                
                                                        <a-form-item label="NodeLocal DNS 二级偏移秒数">
                                                        <a-input-number v-model="config.nodelocaldns_secondary_skew_seconds" style="width: 60%" readonly/>
                                                        </a-form-item>
                                                    
                                                        <a-form-item label="启用 k8s_external 插件">
                                                        <a-switch v-model="config.enable_coredns_k8s_external" disabled/>
                                                        </a-form-item>
                                                    
                                                        <a-form-item label="CoreDNS 外部区域">
                                                        <a-input v-model="config.coredns_k8s_external_zone" style="width: 60%" placeholder="k8s_external.local" readonly/>
                                                        </a-form-item>
                                                    
                                                        <a-form-item label="启用 Endpoint Pod 名称">
                                                        <a-switch v-model="config.enable_coredns_k8s_endpoint_pod_names" disabled/>
                                                        </a-form-item>
                                                -->
                                                    
                                                </a-form>
                                            </a-tab-pane>
                                            <a-tab-pane key="3" title="其他配置">
                                                <a-form :model="config"  style="margin-top: 20px;">
                                                
                                                            <a-form-item label="负载均衡器端口: ">
                                                                <a-input-number v-model="config.loadbalancer_apiserver_port" style="width: 60%" readonly />
                                                            </a-form-item>
                                                    
                                                            <a-form-item label="健康检查端口: ">
                                                                <a-input-number v-model="config.loadbalancer_apiserver_healthcheck_port" style="width: 60%" readonly />
                                                            </a-form-item>
                                                        
                                                            <a-form-item label="服务网络地址: ">
                                                                <a-input v-model="config.kube_service_addresses" style="width: 60%" placeholder="10.233.0.0/18" readonly />
                                                            </a-form-item>
                                                        
                                                            <a-form-item label="Pod子网: ">
                                                                <a-input v-model="config.kube_pods_subnet" style="width: 60%" placeholder="10.233.64.0/18" readonly />
                                                            </a-form-item>
                                                        
                                                            <a-form-item label="网络节点前缀: ">
                                                                <a-input-number v-model="config.kube_network_node_prefix" style="width: 60%" readonly />
                                                            </a-form-item>
                                                        
                                                            <a-form-item label="Proxy模式: ">
                                                                <a-radio-group v-model="config.kube_proxy_mode" disabled>
                                                                <a-radio value="ipvs">IPVS</a-radio>
                                                                <a-radio value="iptables">IPTables</a-radio>
                                                                </a-radio-group>
                                                            </a-form-item>
                                                        
                                                </a-form>
                                            </a-tab-pane>
                                        </a-tabs>
                                    </a-card>
                                </a-collapse-item>
                            </a-collapse>
                        </a-col>
                        <a-col :xs="24" :md="12">
                            <a-card title="主机">
                                <a-form-item label="控制节点" field="controlPlaneHosts">
                                    <div style="display: flex; flex-direction: column; width: 60%;">
                                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                            <a-select
                                                v-model="controlPlaneHost"
                                                class="select-input"
                                                placeholder="请选择控制节点主机"
                                                style="flex: 1; margin-right: 10px;"
                                                multiple
                                            >
                                                <a-option
                                                    v-for="item in filteredControlPlaneHosts"
                                                    :key="item.hostId"
                                                    :value="item.hostIP"
                                                >
                                                    <!-- {{ item.hostIP }} -->
                                                    {{ `${item.hostIP} (${item.os})` }}
                                                </a-option>
                                            </a-select>
                                            <a-button
                                                type="primary"
                                                size="small"
                                                @click="addControlPlaneHost"
                                            >
                                                添加
                                            </a-button>
                                        </div>
                                        <ul style="list-style: none; padding: 0; width: 100%;">
                                            <li
                                                v-for="(host, index) in cluster.controlPlaneHosts"
                                                :key="index"
                                                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border: 1px dashed #d9d9d9; padding: 8px; border-radius: 4px; flex: 1;"
                                            >
                                                <span>{{ host.ip }}</span>
                                                <span style="margin-left:10%;">名字：</span>
                                                <a-input 
                                                    v-model="host.hostName" 
                                                    placeholder="请输入主机名" 
                                                    style="flex-grow: 1; width: 40%;"
                                                />
                                                <a-button type="text" size="small" @click="removeControlPlaneHost(index)" style="color: #ff4d4f; font-size: 16px; padding: 0;">
                                                    <icon-close />
                                                </a-button>
                                            </li>
                                        </ul>
                                    </div>
                                </a-form-item>
                           
                                <a-form-item label="工作节点" field="workerHosts">
                                    <div style="display: flex; flex-direction: column; width: 60%;">
                                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                            <a-select
                                                v-model="workerHost"
                                                class="select-input"
                                                placeholder="请选择工作节点主机"
                                                style="flex: 1; margin-right: 10px;"
                                                multiple
                                            >
                                                <a-option
                                                    v-for="item in filteredWorkerHosts"
                                                    :key="item.hostId"
                                                    :value="item.hostIP"
                                                >
                                                    <!-- {{ item.hostIP }} -->
                                                    {{ `${item.hostIP} (${item.os})` }}
                                                </a-option>
                                            </a-select>
                                            <a-button
                                                type="primary"
                                                size="small"
                                                @click="addWorkerHost"
                                            >
                                                添加
                                            </a-button>
                                        </div>
                                        <ul style="list-style: none; padding: 0; width: 100%;">
                                            <li
                                                v-for="(host, index) in cluster.workerHosts"
                                                :key="index"
                                                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border: 1px dashed #d9d9d9; padding: 8px; border-radius: 4px; flex: 1;"
                                            >
                                                <span>{{ host.ip }}</span>
                                                <span style="margin-left:10%;">名字：</span>
                                                <a-input 
                                                    v-model="host.hostName" 
                                                    placeholder="请输入主机名" 
                                                    style="flex-grow: 1; width: 40%;"
                                                />
                                                <a-button type="text" size="small" @click="removeWorkerHost(index)" style="color: #ff4d4f; font-size: 16px; padding: 0;">
                                                <icon-close />
                                                </a-button>
                                            </li>
                                        </ul>
                                    </div>
                                </a-form-item>
                            </a-card>
                        </a-col>
                    </a-row>
                </a-form>
                <transition name="fade">
                    <div v-if="!nodeList" class="loading-overlay">
                        <div class="loading-spinner"></div>
                    </div>
                </transition>
            </a-card>
        </div>
    </div>
</template>
<script lang="ts" setup>

    import { ref, onMounted, computed, reactive, watch } from 'vue';
    import useLoading from '@/hooks/loading';
    import { getResources } from '@/api/resources';
    import { getAvailableHostList } from '@/api/hosts';
    import { getNodeList } from '@/api/node';
    import { editCluster, getClusterList} from '@/api/cluster';
    import { Message } from '@arco-design/web-vue';
    import router from '@/router';
    import { useRoute } from 'vue-router';

    const route = useRoute();
    const { loading, setLoading } = useLoading();
    const resourceList = ref();
    const hostList = ref([]);
    const controlPlaneHost = ref();
    const networkPlugins = ref<any>();
    // const workerHost = ref('');
    const workerHost = ref<string[]>([]);
    const clusterList = ref();
    const nodeList = ref();
    const id = ref(route.query.id);
    const supportedOS = ref();
    const k8sCache = ref();
    const repoFiles =ref();
    const cluster = reactive({
        clusterName: '',
        networkPlugin: '',
        version: '',
        taskNum: 5,
        controlPlaneHosts: [] as Array<{ip: string; hostName: string; role: string; os: string; user: string; lastJobType?: string; lastJobStatus?: string; createTime: string }>,
        workerHosts: [] as Array<{ ip: string; hostName: string; role: string; os: string; user: string; lastJobType?: string; lastJobStatus?: string; createTime: string }>
    });

    const config = reactive({
        loadbalancer_apiserver_port: 6443,
        loadbalancer_apiserver_healthcheck_port: 8081,
        kube_service_addresses: "10.233.0.0/18",
        kube_pods_subnet: "10.233.64.0/18",
        kube_network_node_prefix: 24,
        kube_proxy_mode: "ipvs",
        dns_mode: 'coredns',
        enable_nodelocaldns: true,
        enable_nodelocaldns_secondary: false,
        nodelocaldns_ip: '169.254.25.10',
        nodelocaldns_health_port: 9254,
        nodelocaldns_second_health_port: 9256,
        nodelocaldns_bind_metrics_host_ip: false,
        nodelocaldns_secondary_skew_seconds: 5,
        enable_coredns_k8s_external: false,
        coredns_k8s_external_zone: 'k8s_external.local',
        enable_coredns_k8s_endpoint_pod_names: false,

        kube_reserved: false, 
        kube_memory_reserved: '256Mi', 
        kube_cpu_reserved: '100m', 
        kube_ephemeral_storage_reserved: '2Gi', 
        kube_pid_reserved: '1000', 

        system_reserved: true, 
        system_memory_reserved: '512Mi', 
        system_cpu_reserved: '500m', 
        system_ephemeral_storage_reserved: '2Gi', 
        system_master_memory_reserved: '256Mi', 
        system_master_cpu_reserved: '250m', 
    });

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

    const hosts = computed(() => {
        const formatHost = (host: any, role: string) => ({
            ip: host.ip,
            hostName: host.hostName,
            role,
            os: host.os,
            user: host.user,
            ...(host.lastJobType && { lastJobType: host.lastJobType }),
            ...(host.lastJobStatus && { lastJobStatus: host.lastJobStatus })
        });

        return [
            ...cluster.controlPlaneHosts.map(host => formatHost(host, 'master')),
            ...cluster.workerHosts.map(host => formatHost(host, 'node'))
        ];
    });

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

    const extractMajorMinor = (version: string)=> {
        const match = version.match(/(v?\d+\.\d+)/);
        return match ? match[1] : '';
    }

    const filteredControlPlaneHosts = computed(() => {
        return hostList.value.filter((host) => {
            const osName = host.os.split(' ')[0]; 
            const isOSCompatible = Array.isArray(supportedOS.value) && supportedOS.value.length 
                ? supportedOS.value.includes(osName) 
                : true;
            return (
                isOSCompatible &&
                !cluster.controlPlaneHosts.some((selectedHost) => selectedHost.ip === host.hostIP) &&
                !cluster.workerHosts.some((selectedHost) => selectedHost.ip === host.hostIP)
            );
        });
    });

    const filteredWorkerHosts = computed(() => {
        return hostList.value.filter((host) => {
            const osName = host.os.split(' ')[0];
            const isOSCompatible = Array.isArray(supportedOS.value) && supportedOS.value.length 
                ? supportedOS.value.includes(osName) 
                : true;

            return (
                isOSCompatible &&
                !cluster.controlPlaneHosts.some((selectedHost) => selectedHost.ip === host.hostIP) &&
                !cluster.workerHosts.some((selectedHost) => selectedHost.ip === host.hostIP)
            );
        });
    });

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

            // const selectedHostOS = selectedHost.os.split(' ')[0]; // 获取操作系统名称
            
            // 获取所有工作节点的操作系统集合
            const workerOSSet = new Set(cluster.workerHosts.map(host => (host.os ? host.os.split(' ')[0] : '')).filter(os => os));

            // // 如果已经选择了工作节点，检查控制节点的操作系统是否一致
            // if (workerOSSet.size > 0 && !workerOSSet.has(selectedHostOS)) {
            //     Message.error(`控制节点 ${selectedIP} 的操作系统必须与工作节点的操作系统一致`);
            //     return;
            // }

            // 检查是否已经添加过
            if (!cluster.controlPlaneHosts.some(host => host.ip === selectedIP)) {
                const segments = selectedHost.hostIP.split('.');
                const result = segments[2] + segments[3];
                const hostName = `master${result}`;

                const newHost: any = {
                    ip: selectedIP,
                    hostName,
                    role: 'master',
                    os: selectedHost.os,
                    user: selectedHost.user,
                    createTime: selectedHost.createTime
                };

                if (selectedHost.lastJobType) newHost.lastJobType = selectedHost.lastJobType;
                if (selectedHost.lastJobStatus) newHost.lastJobStatus = selectedHost.lastJobStatus;

                cluster.controlPlaneHosts.push(newHost);
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

        workerHost.value.forEach(ip => {
            if (!cluster.workerHosts.some(host => host.ip === ip)) {
                const selectedHost = hostList.value.find(host => host.hostIP === ip);
                if (!selectedHost) return;

                const segments = selectedHost.hostIP.split('.');
                const result = segments[2] + segments[3];
                const hostName = `node${result}`;

                const newWorker: any = {
                    ip,
                    hostName,
                    role: 'node',
                    os: selectedHost.os,
                    user: selectedHost.user,
                    createTime: selectedHost.createTime
                };

                if (selectedHost.lastJobType) newWorker.lastJobType = selectedHost.lastJobType;
                if (selectedHost.lastJobStatus) newWorker.lastJobStatus = selectedHost.lastJobStatus;

                cluster.workerHosts.push(newWorker);
            }
        });
        workerHost.value = [];
    };

    const removeWorkerHost = (index: any) => {
        cluster.workerHosts.splice(index, 1);
    };

   //获取离线包列表
   const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result = await getResources(k8sVersion);
            resourceList.value = result.data;
            resourceList.value.forEach(item => {
                if (item.name === 'k8s_cache') {
                    k8sCache.value = item;
                }
                 else if (item.name === 'network_plugins') {
                    networkPlugins.value = item
                }
                 else if (item.name === 'repo_files') {
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

    const formattedPlugins = computed(() => {
        if (!networkPlugins.value || !networkPlugins.value.children) return [];

        // 获取当前选择的 Kubernetes 版本
        const k8sVersion = cluster.version;

        // 解析版本号为数组 [major, minor, patch]
        const parseVersion = (version: string) => {
            const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
            return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
        };

        const k8sVersionParsed = parseVersion(k8sVersion);

        return networkPlugins.value.children.flatMap(plugin => {
            // 仅处理 Calico 插件
            if (plugin.name.toLowerCase() === 'calico') {
                return (plugin.children || []).filter(versionNode => {
                    const calicoVersionParsed = parseVersion(versionNode.name); // 解析 Calico 版本

                    if (!k8sVersionParsed || !calicoVersionParsed) return false;

                    const [k8sMajor, k8sMinor] = k8sVersionParsed;
                    const [, calicoMinor] = calicoVersionParsed;

                    // 根据 Kubernetes 版本范围过滤 Calico 版本
                    if (k8sMajor === 1 && k8sMinor >= 25 && k8sMinor <= 27) {
                        return calicoMinor <= 25; // 1.25-1.27 的 k8s 只能用 3.25 及以下的 Calico
                    } else if (k8sMajor === 1 && k8sMinor >= 28 && k8sMinor <= 30) {
                        return calicoMinor >= 26; // 1.28-1.30 的 k8s 只能用 3.26 及以上的 Calico
                    }
                    return false; // 其他情况不显示
                }).map(versionNode => {
                    const imagesNode = versionNode.children?.find(child => child.name === 'images');

                    return {
                        name: plugin.name,
                        version: versionNode?.name,
                        images: imagesNode?.children || [],
                        files: versionNode.children
                            ?.filter(child => child.name !== 'images' && child.type === 'file') || []
                    };
                });
            }

            // 对于非 Calico 插件，直接返回所有版本
            return (plugin.children || []).map(versionNode => {
                const imagesNode = versionNode.children?.find(child => child.name === 'images');

                return {
                    name: plugin.name,
                    version: versionNode?.name,
                    images: imagesNode?.children || [],
                    files: versionNode.children
                        ?.filter(child => child.name !== 'images' && child.type === 'file') || []
                };
            });
        });
    });

    // 监听 cluster.version 的变化
    watch(
        () => cluster.version,
        (newVersion) => {
            console.log('Kubernetes 版本切换为:', newVersion);
            if (formattedPlugins.value.length) {
            // 更新默认网络插件为第一个可用的插件
            cluster.networkPlugin = `${formattedPlugins.value[0].name} - ${formattedPlugins.value[0].version}`;
            } else {
            cluster.networkPlugin = ''; // 如果没有可用插件，清空选择
            }
        }
    );

    //获取主机列表
    const fetchHostList = async () => {
      try {
        setLoading(true);
        const k8sVersion = getFirstK8sVersionFromStorage();
        const result = await getAvailableHostList(k8sVersion);
        hostList.value = result.data;
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchHostList();
    fetchResourcesList();

    onMounted(async () => {

        await fetchClustersList();
        await fetchNodeList();
        if (Array.isArray(clusterList.value)) {
            clusterList.value.forEach(item => {
                if (item.id === id.value) {
                    cluster.clusterName = item.clusterName || '';
                    cluster.networkPlugin = item.networkPlugin || '';
                    cluster.version = item.version || '';
                    cluster.taskNum = Number(item.taskNum) || 0;
                }
            });
        } else {
            console.error('clusterList is not an array or undefined');
        }
        console.log(nodeList.value);
        if (Array.isArray(nodeList.value)) {
            nodeList.value.forEach(item => {
                if (item.role === "master") {
                    cluster.controlPlaneHosts.push(item);
                }else{
                    cluster.workerHosts .push(item);
                }
            });
        } else {
            console.error('nodeList is not an array or undefined');
        }
    });

    //获取集群列表
    const fetchClustersList = async () => {
        try {
            setLoading(true);
            const k8sVersion = getFirstK8sVersionFromStorage();
            const result = await getClusterList(k8sVersion);
            clusterList.value = result.data;
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
        const k8sVersion = getFirstK8sVersionFromStorage();
        const result = await getNodeList(id.value, k8sVersion);
        nodeList.value = result.data;
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    const handleEditCluster = async () => {

        // 校验必填参数
        if (!cluster.clusterName) {
            Message.error("集群名称不能为空！");
            return; 
        }

        if (cluster.controlPlaneHosts.length === 0) {
            Message.error("至少需要一个控制节点！");
            return;
        }

        // 校验控制节点个数是否为单数
        if (cluster.controlPlaneHosts.length % 2 === 0) {
            Message.error(`当前选择了 ${cluster.controlPlaneHosts.length} 个控制节点，建议保持单数以保证高可用！`);
            return;
        }

        // 校验主机名称
        const hostNames = hosts.value.map(host => host.hostName); 
        const duplicateHostNames = hostNames.filter((name, index) => hostNames.indexOf(name) !== index);
        
        if (duplicateHostNames.length > 0) {
            Message.error("主机名称不能重复！");
            return;
        }

        if (hostNames.some(name => !name)) {
            Message.error("主机名称不能为空！");
            return;
        }

        const data = {
            id: id.value,
            clusterName: cluster.clusterName,
            networkPlugin: cluster.networkPlugin,
            version: cluster.version,
            taskNum: cluster.taskNum,
            hosts: hosts.value, 
        };
       
        try{
            setLoading(true);
            const k8sVersion = getMappedK8sVersion(data.version);
            const result: any = await editCluster(data, k8sVersion);
            if(result.status === 'ok'){
                Message.success("编辑成功！")
                router.push('/cluster').then(() => {
                    window.location.reload();
                })
                fetchClustersList();
            }else{
                Message.error(result.msg);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    }
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

    .menu-demo {
        width: 100%;
        height: 600px;
        padding: 40px;
        box-sizing: border-box;
        background-color: var(--color-neutral-2);
    }

    .menu-demo .arco-menu {
        width: 200px;
        height: 100%;
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
    }

    .menu-demo .arco-menu :deep(.arco-menu-collapse-button) {
        width: 32px;
        height: 32px;
        border-radius: 50%;
    }

    .menu-demo .arco-menu:not(.arco-menu-collapsed) :deep(.arco-menu-collapse-button) {
        right: 0;
        bottom: 8px;
        transform: translateX(50%);
    }

    .menu-demo .arco-menu:not(.arco-menu-collapsed)::before {
        content: '';
        position: absolute;
        right: 0;
        bottom: 0;
        width: 48px;
        height: 48px;
        background-color: inherit;
        border-radius: 50%;
        box-shadow: -4px 0 2px var(--color-bg-2), 0 0 1px rgba(0, 0, 0, 0.3);
        transform: translateX(50%);
    }

    .menu-demo .arco-menu.arco-menu-collapsed {
        width: 48px;
        height: auto;
        padding-top: 24px;
        padding-bottom: 138px;
        border-radius: 22px;
    }

    .menu-demo .arco-menu.arco-menu-collapsed :deep(.arco-menu-collapse-button) {
        right: 8px;
        bottom: 8px;
    }

    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.7);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .loading-spinner {
        border: 2px solid #f3f3f3; 
        border-top: 3px solid #346bf6; 
        border-radius: 50%;
        width: 22px;
        height: 22px; 
        animation: spin 2s linear infinite; 
    }

    /* 添加旋转动画 */
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

</style>