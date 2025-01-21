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
                                    label="离线包："
                                    field="offlinePackage"
                                    :rules="[{ required: true, message: '请选择离线包' }]"
                                >
                                    <a-select
                                        v-model="cluster.offlinePackage"
                                        class="select-input"
                                        placeholder="请选择离线包"
                                        style="width: 65%;"
                                    >
                                        <a-option
                                            v-for="item in resourceList"
                                            :key="item.id"
                                            :value="item.package_name"
                                        >
                                            {{ item.package_name }}
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
                                            v-for="plugin in networkPlugins"
                                            :key="plugin"
                                            :value="plugin"
                                        >
                                            {{ plugin }}
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

    import { ref, watch, onMounted, computed, reactive } from 'vue';
    import useLoading from '@/hooks/loading';
    import { getResourcesList } from '@/api/resources';
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
    const controlPlaneHost = ref('');
    const networkPlugins = ref([]);
    // const workerHost = ref('');
    const workerHost = ref<string[]>([]);
    const clusterList = ref();
    const nodeList = ref();
    const id = ref(route.query.id);
    const supportedOS = ref();
    const cluster = reactive({
        clusterName: '',
        offlinePackage: '',
        networkPlugin: '',
        version: '',
        taskNum: 0,
        controlPlaneHosts: [] as Array<{ ip: string; hostName: string; role: string }>,
        workerHosts: [] as Array<{ ip: string; hostName: string; role: string }>
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

    const hosts = computed(() => {
        return [
            ...cluster.controlPlaneHosts.map(host => ({
                ...host, 
                hostName: host.hostName,
                role: 'master'
            })),
            ...cluster.workerHosts.map(host => ({
                ...host, 
                hostName: host.hostName,
                role: 'node'
            }))
        ];
    });

    const filteredControlPlaneHosts = computed(() => {
        return hostList.value.filter((host) => {
            
            const osName = host.os.split(' ')[0]; 

            const isOSCompatible = supportedOS.value
                ? osName.includes(supportedOS.value)
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

            const isOSCompatible = supportedOS.value
                ? osName.includes(supportedOS.value) 
                : true;

            return (
                isOSCompatible &&
                !cluster.controlPlaneHosts.some((selectedHost) => selectedHost.ip === host.hostIP) &&
                !cluster.workerHosts.some((selectedHost) => selectedHost.ip === host.hostIP)
            );
        });
    });

    // 检查是否存在重复主机名
    const checkDuplicateHostName = (hostName, index) => {
      const isDuplicate = cluster.workerHosts.some((host, i) => host.hostName === hostName && i !== index);
      if (isDuplicate) {
        Message.error('主机名字重复，请输入唯一的主机名');
        cluster.workerHosts[index].hostName = ''; // 清空重复的主机名
      }
    };

     // 检查是否已经存在该主机
     const isHostExist = (hostIP) => {
      return cluster.workerHosts.some(host => host.ip === hostIP);
    };

    // const addControlPlaneHost = () => {
    //     if (!controlPlaneHost) {
    //         Message.error("请选择控制节点主机！");
    //         return;
    //     }
    //     const masterExists = cluster.controlPlaneHosts.some(host => host.role === 'master');
    //     if (masterExists) {
    //         Message.error('已经存在一个 master 节点，无法再添加。');
    //         return;
    //     }
    //     if (controlPlaneHost.value && !cluster.controlPlaneHosts.some(host => host.ip === controlPlaneHost.value)) {
    //         const selectedHost = hostList.value.find(host => host.hostIP === controlPlaneHost.value);
    //         const segments = selectedHost.hostIP.split('.'); 
    //         const result = segments[2] + segments[3];
    //         const hostName = `master${result}`;
    //         cluster.controlPlaneHosts.push({ ip: controlPlaneHost.value, hostName, role: 'master' });
    //         controlPlaneHost.value = '';
    //     }
    // };

    // const removeControlPlaneHost = (index: any) => {
    //     cluster.controlPlaneHosts.splice(index, 1);
    // };

    // const addWorkerHost = () => {

    //     if (workerHost.value && !isHostExist(workerHost.value)) {
    //         workerHost.value.forEach(ip => {
    //             if (!cluster.workerHosts.some(host => host.ip === ip)) {
    //                 const selectedHost = hostList.value.find(host => host.hostIP === ip);
    //                 const segments = selectedHost.hostIP.split('.'); 
    //                 const result = segments[2] + segments[3];
    //                 const hostName = `node${result}`;
    //                 cluster.workerHosts.push({ ip, hostName, role: 'node' });
    //             }
    //         });
    //         workerHost.value = [];
    //     } else {
    //         Message.error('该主机已存在');
    //     }
    // };

    const addControlPlaneHost = () => {
    if (!controlPlaneHost) {
        Message.error("请选择控制节点主机！");
        return;
    }

    const masterExists = cluster.controlPlaneHosts.some(host => host.role === 'master');
    if (masterExists) {
        Message.error('已经存在一个 master 节点，无法再添加。');
        return;
    }

    if (controlPlaneHost.value) {
        // 检查该主机是否已经被添加为工作节点
        const isWorkerNode = cluster.workerHosts.some(host => host.ip === controlPlaneHost.value);
        if (isWorkerNode) {
            Message.error('该主机已被添加为工作节点，不能再作为控制节点使用！');
            return;
        }

        // 添加控制节点
        if (!cluster.controlPlaneHosts.some(host => host.ip === controlPlaneHost.value)) {
            const selectedHost = hostList.value.find(host => host.hostIP === controlPlaneHost.value);
            const segments = selectedHost.hostIP.split('.');
            const result = segments[2] + segments[3];
            const hostName = `master${result}`;
            cluster.controlPlaneHosts.push({ ip: controlPlaneHost.value, hostName, role: 'master' });
            controlPlaneHost.value = '';
        }
    }
};

const removeControlPlaneHost = (index) => {
    cluster.controlPlaneHosts.splice(index, 1);
};

const addWorkerHost = () => {
    if (workerHost.value && !isHostExist(workerHost.value)) {
        workerHost.value.forEach(ip => {
            // 检查该主机是否已经被添加为控制节点
            const isControlPlaneNode = cluster.controlPlaneHosts.some(host => host.ip === ip);
            if (isControlPlaneNode) {
                Message.error('该主机已被添加为控制节点，不能再作为工作节点使用！');
                return;
            }

            // 添加工作节点
            if (!cluster.workerHosts.some(host => host.ip === ip)) {
                const selectedHost = hostList.value.find(host => host.hostIP === ip);
                const segments = selectedHost.hostIP.split('.');
                const result = segments[2] + segments[3];
                const hostName = `node${result}`;
                cluster.workerHosts.push({ ip, hostName, role: 'node' });
            }
        });
        workerHost.value = [];
    } else {
        Message.error('该主机已存在');
    }
};


    const removeWorkerHost = (index: any) => {
        cluster.workerHosts.splice(index, 1);
    };

    //获取离线包列表
    const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const result = await getResourcesList();
            resourceList.value = result.data;
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    //获取主机列表
    const fetchHostList = async () => {
      try {
        setLoading(true);
        const result = await getAvailableHostList();
        hostList.value = result.data;
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchHostList();
    fetchResourcesList();

    watch(
        () => cluster.offlinePackage,
        (newPackage, oldPackage) => {
            const versionMatch = newPackage?.match(/v\d+\.\d+\.\d+/);
            cluster.version = versionMatch ? versionMatch[0] : '';

            const selectedPackage = resourceList.value.find(
                (item) => item.package_name === newPackage
            );

            networkPlugins.value = selectedPackage?.network_plugin || [];

            // const osMatch = newPackage?.match(/_(\w+(-\w+)*)(_|\s|$)/);
            // const newOS = osMatch ? osMatch[1] : null;
            const osMatch = newPackage?.match(/_(\w+(?:-\w+)*)(_|\s|$)/);
            const newOS = osMatch ? osMatch[1].replace('-Linux', '') : 'null';

            if (supportedOS.value && newOS && supportedOS.value !== newOS) {
                cluster.controlPlaneHosts = [];
                cluster.workerHosts = [];
            }

            supportedOS.value = newOS;
        }
    );

    onMounted(async () => {

        await fetchClustersList();
        await fetchNodeList();
        if (Array.isArray(clusterList.value)) {
            clusterList.value.forEach(item => {
                console.log(item.networkPlugin);
                if (item.id === id.value) {
                    cluster.clusterName = item.clusterName || '';
                    cluster.offlinePackage = item.offlinePackage || '';
                    cluster.networkPlugin = item.networkPlugin || '';
                    cluster.version = item.version || '';
                    cluster.taskNum = Number(item.taskNum) || 0;
                }
            });
        } else {
            console.error('clusterList is not an array or undefined');
        }
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
            const result = await getClusterList();
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
        const result = await getNodeList(id.value);
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

        if (!cluster.offlinePackage) {
            Message.error("离线包不能为空！");
            return; 
        }

        if (cluster.controlPlaneHosts.length === 0) {
            Message.error("至少需要一个控制节点！");
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
            offlinePackage: cluster.offlinePackage,
            networkPlugin: cluster.networkPlugin,
            version: cluster.version,
            taskNum: cluster.taskNum,
            hosts: hosts.value, 
        };
        try{
            setLoading(true);
            const result: any = await editCluster(data);
            if(result.status === 'ok'){
                Message.success("编辑成功！")
                router.push('/cluster').then(() => {
                    window.location.reload();
                })
                fetchClustersList();
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