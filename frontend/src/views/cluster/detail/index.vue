<template>
    <div class="container">
      <a-breadcrumb :style="{ fontSize: '14px', marginTop: '16px', marginBottom: '16px' }">
        <a-breadcrumb-item>
          <icon-apps />
        </a-breadcrumb-item>
        <a-breadcrumb-item>{{ t('cluster.detail.breadcrumb.cluster') }}</a-breadcrumb-item>
        <a-breadcrumb-item>{{ t('cluster.detail.breadcrumb.detail') }}</a-breadcrumb-item>
      </a-breadcrumb>
      <div class="layout">
        <a-card>
          <a-card  :title="t('cluster.detail.card.title.overview')">
            <a-form :model="cluster" style="margin-top: 20px;">
              <a-row :gutter="[24, 24]">
                <a-col :xs="24" :md="12">
                  <a-card :title="t('cluster.detail.card.title.basic')" style="position: relative;">
                    <a-form-item
                          :label="t('cluster.detail.form.label.clusterName')"
                          field="clusterName"
                          style="display: flex; align-items: center;"
                      >
                          <span style="width: 60%; color: #000000;">{{ cluster.clusterName }}</span>
                      </a-form-item>

                      <a-form-item :label="t('cluster.detail.form.label.clusterVersion')" field="version">
                          <span style="width: 60%; color: #000000;">{{ cluster.version }}</span>
                      </a-form-item>

                      <a-form-item
                          :label="t('cluster.detail.form.label.networkPlugin')"
                          field="networkPlugin"
                      >
                          <span style="width: 60%; color: #000000;">{{ cluster.networkPlugin }}</span>
                      </a-form-item>
                  </a-card>
                </a-col>
                <a-col :xs="24" :md="12">
                  <a-card :title="t('cluster.detail.card.title.config')" style="position: relative;">
                      <a-tabs default-active-key="1">
                          <a-tab-pane key="1" :title="t('cluster.detail.tab.title.resourceReservation')">
                              <a-form :model="config"  style="margin-top: 20px;">
                                  <!-- <a-form-item label="启用k8s资源预留:">
                                      <a-switch v-model="config.kube_reserved" disabled/>
                                  </a-form-item> -->
                                  <template v-if="config.kube_reserved">
                                      <!-- <a-form-item label="内存: ">
                                          <a-input v-model="config.kube_memory_reserved" placeholder="如：256Mi" style="width: 70%;" readonly/>
                                      </a-form-item>
                                      <a-form-item :label="t('cluster.detail.form.label.cpu')">
                                          <a-input v-model="config.kube_cpu_reserved" placeholder="如：100m" style="width: 70%;" readonly/>
                                      </a-form-item> -->

                                      <a-form-item :label="t('cluster.detail.form.label.memory')">
                                          <span style="width: 70%; color: #000000;">{{ config.kube_memory_reserved || '如：256Mi' }}</span>
                                      </a-form-item>
                                      <a-form-item :label="t('cluster.detail.form.label.cpu')">
                                          <span style="width: 70%; color: #000000;">{{ config.kube_cpu_reserved || '如：100m' }}</span>
                                      </a-form-item>
                                  </template>

                                  <template v-if="config.system_reserved">
                                    <a-form-item>
                                        <span style="color: #000000; font-weight: bold; margin-left: -120px; margin-top: -20px;">{{t('cluster.detail.form.label.systemResourceReservation')}}</span>
                                    </a-form-item>
                                    <div style="margin-left: -60px; margin-top: -25px">
                                        <a-form-item :label="t('cluster.detail.form.label.memory')">
                                            <span style="color: #333333; display: inline-block; width: 70%;">{{ config.system_memory_reserved || '如：512Mi' }}</span>
                                        </a-form-item>
                                        <a-form-item :label="t('cluster.detail.form.label.cpu')">
                                            <span style="color: #333333; display: inline-block; width: 70%;">{{ config.system_cpu_reserved || '如：500m' }}</span>
                                        </a-form-item>
                                    </div>
                                </template>
                              </a-form>
                          </a-tab-pane>
                      
                          <a-tab-pane key="2" :title="t('cluster.detail.tab.title.domainResolution')">
                              <a-form :model="config" style="margin-top: 20px;">
                                      <!-- <a-form-item label="DNS模式: ">
                                        <a-select v-model="config.dns_mode" style="width: 60%" disabled>
                                          <a-option :value=config.dns_mode>{{config.dns_mode}}</a-option>
                                        </a-select>
                                      </a-form-item>
                                     
                                      <a-form-item :label="t('cluster.detail.form.label.enableNodeLocalDns')">
                                          <a-switch v-model="config.enable_nodelocaldns" disabled/>
                                      </a-form-item>
                                 
                                      <a-form-item :label="t('cluster.detail.form.label.enableNodeLocalDnsSecondary')">
                                          <a-switch v-model="config.enable_nodelocaldns_secondary" disabled/>
                                      </a-form-item> -->
                                      <a-form-item :label="t('cluster.detail.form.label.dnsMode')">
                                        <span>{{ config.dns_mode }}</span>
                                      </a-form-item>

                                      <a-form-item :label="t('cluster.detail.form.label.enableNodeLocalDns')">
                                        <span>{{ config.enable_nodelocaldns ? t('cluster.detail.form.value.yes') : t('cluster.detail.form.value.no') }}</span>
                                      </a-form-item>

                                      <a-form-item :label="t('cluster.detail.form.label.enableNodeLocalDnsSecondary')">
                                        <span >{{ config.enable_nodelocaldns_secondary ? t('cluster.detail.form.value.yes') : t('cluster.detail.form.value.no') }}</span>
                                      </a-form-item>
                                  <!-- 
                                      <a-col :xs="24" :sm="12" :md="11">
                                      <a-form-item label="本地DNS IP">
                                      <a-input v-model="config.nodelocaldns_ip" style="width: 60%" placeholder="169.254.25.10"  readonly/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="11">
                                      <a-form-item label="本地DNS健康检查端口">
                                      <a-input-number v-model="config.nodelocaldns_health_port" style="width: 60%" readonly/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="12">
                                      <a-form-item label="第二健康检查端口">
                                      <a-input-number v-model="config.nodelocaldns_second_health_port" style="width: 60%" readonly/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="12">
                                      <a-form-item label="绑定主机 IP">
                                      <a-switch v-model="config.nodelocaldns_bind_metrics_host_ip" disabled/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="12">
                                      <a-form-item label="NodeLocal DNS 二级偏移秒数">
                                      <a-input-number v-model="config.nodelocaldns_secondary_skew_seconds" style="width: 60%" readonly/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="12">
                                      <a-form-item label="启用 k8s_external 插件">
                                      <a-switch v-model="config.enable_coredns_k8s_external" disabled/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="12">
                                      <a-form-item label="CoreDNS 外部区域">
                                      <a-input v-model="config.coredns_k8s_external_zone" style="width: 60%" placeholder="k8s_external.local" readonly/>
                                      </a-form-item>
                                  </a-col> 
                                      <a-col :xs="24" :sm="12" :md="12">
                                      <a-form-item label="启用 Endpoint Pod 名称">
                                      <a-switch v-model="config.enable_coredns_k8s_endpoint_pod_names" disabled/>
                                      </a-form-item>
                                  </a-col>  -->
                              </a-form>
                          </a-tab-pane>
                          <a-tab-pane key="3" :title="t('cluster.detail.tab.title.otherConfig')">
                            <a-form :model="config"  style="margin-top: 20px;">
                              <!-- <a-form-item label="负载均衡器端口: ">
                                  <a-input-number v-model="config.loadbalancer_apiserver_port" style="width: 60%" readonly />
                              </a-form-item>
                          
                              <a-form-item :label="t('cluster.detail.form.label.loadBalancerApiServerHealthCheckPort')">
                                  <a-input-number v-model="config.loadbalancer_apiserver_healthcheck_port" style="width: 60%" readonly />
                              </a-form-item>
                          
                              <a-form-item :label="t('cluster.detail.form.label.kubeServiceAddresses')">
                                  <a-input v-model="config.kube_service_addresses" style="width: 60%" placeholder="10.233.0.0/18" readonly />
                              </a-form-item>
                          
                              <a-form-item :label="t('cluster.detail.form.label.kubePodsSubnet')">
                                  <a-input v-model="config.kube_pods_subnet" style="width: 60%" placeholder="10.233.64.0/18" readonly />
                              </a-form-item>
                          
                              <a-form-item :label="t('cluster.detail.form.label.kubeNetworkNodePrefix')">
                                  <a-input-number v-model="config.kube_network_node_prefix" style="width: 60%" readonly />
                              </a-form-item>
                          
                              <a-form-item :label="t('cluster.detail.form.label.kubeProxyMode')">
                                  <a-radio-group v-model="config.kube_proxy_mode" disabled>
                                  <a-radio value="ipvs">IPVS</a-radio>
                                  <a-radio value="iptables">IPTables</a-radio>
                                  </a-radio-group>
                              </a-form-item> -->
                              <a-form-item :label="t('cluster.detail.form.label.loadBalancerApiServerPort')">
                                  <span style="width: 60%; display: inline-block; color: #333333;">{{ config.loadbalancer_apiserver_port || t('cluster.detail.form.value.notSet') }}</span>
                              </a-form-item>

                              <a-form-item :label="t('cluster.detail.form.label.healthCheckPort')">
                                  <span style="width: 60%; display: inline-block; color: #333333;">{{ config.loadbalancer_apiserver_healthcheck_port || t('cluster.detail.form.value.notSet') }}</span>
                              </a-form-item>

                              <a-form-item :label="t('cluster.detail.form.label.serviceNetworkAddress')">
                                  <span style="width: 60%; display: inline-block; color: #333333;">{{ config.kube_service_addresses || '10.233.0.0/18' }}</span>
                              </a-form-item>

                              <a-form-item :label="t('cluster.detail.form.label.podSubnet')">
                                  <span style="width: 60%; display: inline-block; color: #333333;">{{ config.kube_pods_subnet || '10.233.64.0/18' }}</span>
                              </a-form-item>

                              <a-form-item :label="t('cluster.detail.form.label.networkNodePrefix')">
                                  <span style="width: 60%; display: inline-block; color: #333333;">{{ config.kube_network_node_prefix || t('cluster.detail.form.value.notSet') }}</span>
                              </a-form-item>

                              <a-form-item :label="t('cluster.detail.form.label.proxyMode')">
                                  <span style="width: 60%; display: inline-block; color: #333333;">
                                      {{ config.kube_proxy_mode === 'ipvs' ? 'IPVS' : config.kube_proxy_mode === 'iptables' ? 'IPTables' : t('cluster.detail.form.value.notSet') }}
                                  </span>
                              </a-form-item>

                            </a-form>
                        </a-tab-pane>
                      </a-tabs>
                  </a-card>
                </a-col>
              </a-row>
            </a-form>
          </a-card>
          <a-card :title="t('cluster.detail.card.title.nodeAndTask')">
            <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
              <a-tab-pane key="1" :title="t('cluster.detail.tab.title.nodeManagement')" >
                <Node :key="tabKeys['1']" :upgradeK8sVersion = upgradeK8sVersion :upgradeNetworkPlugin = upgradeNetworkPlugin :taskProcess = taskProcess />
              </a-tab-pane>
              <a-tab-pane key="2" :title="t('cluster.detail.tab.title.taskQueue')" >
                <TaskQueue :key="tabKeys['2']" :upgradeK8sVersion = upgradeK8sVersion   />
              </a-tab-pane>
              <a-tab-pane key="3" :title="t('cluster.detail.tab.title.taskHistory')">
                <TaskHistory :key="tabKeys['3']" />
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </a-card>
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { useI18n } from 'vue-i18n';
  import { ref, reactive, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import useLoading from '@/hooks/loading';
  import Node from '@/views/node/index.vue';
  import TaskQueue from '@/views/task/TaskQueue.vue';
  import TaskHistory from '@/views/task/TaskHistory.vue';
  import { getClusterList } from '@/api/cluster';
  import { Message } from '@arco-design/web-vue';
  
  const { t } = useI18n();
  const { loading, setLoading } = useLoading();
  const route = useRoute();
  const clusterList = ref();
  const id = ref(route.query.id);
  const taskProcess = ref();

  const activeTab = ref('1'); // 当前激活的标签
  const tabKeys = ref({
    '1': 1,
    '2': 2,
    '3': 3,
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
              console.error(t('cluster.detail.message.error.parseVersion'), parseError);
          }
      }
      return '';
  };

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

  const cluster = reactive({
      clusterName: '',
      offlinePackage: '',
      networkPlugin: '',
      version: '',
      taskNum: '0',
  });
  const upgradeK8sVersion = ref();
  const upgradeNetworkPlugin =ref();
  
  // 切换标签时更新对应子组件的 key
  const handleTabChange = (key: string) => {
    tabKeys.value[key] += 1;
  };

  //获取集群列表
  const fetchClustersList = async () => {
    // 检查次版本是否存在
    const versionMapStr = localStorage.getItem('k8sVersionMap');
    if (!versionMapStr) {
        Message.error(t('cluster.detail.message.error.noBackend'));
        return;
    }
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

  onMounted(async () => {

    await fetchClustersList();
    if (Array.isArray(clusterList.value)) {
        clusterList.value.forEach(item => { 
            if (item.id === id.value) {
                cluster.clusterName = item.clusterName || '';
                cluster.offlinePackage = item.offlinePackage || '';
                cluster.networkPlugin = item.networkPlugin || '';
                cluster.version = item.version || '';
                cluster.taskNum = item.taskNum || '0';
                if(item.upgradeK8sVersion){
                  upgradeK8sVersion.value = item.upgradeK8sVersion;
                }
                if(item.upgradeNetworkPlugin){
                  upgradeNetworkPlugin.value = item.upgradeNetworkPlugin;
                }
                taskProcess.value = item.taskProcess
            }
        });
    } else {
        console.error('clusterList is not an array or undefined');
    }
  });

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
  </style>
  