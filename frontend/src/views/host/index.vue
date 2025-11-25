<template>
  <div class="container">
    <a-breadcrumb :style="{fontSize: '14px', marginTop: '16px', marginBottom: '16px'}">
      <a-breadcrumb-item>
        <icon-apps />
      </a-breadcrumb-item>
      <a-breadcrumb-item>{{ t('host.breadcrumb.host') }}</a-breadcrumb-item>
    </a-breadcrumb>
    <div class="layout">
      <a-card>
        <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
          <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
              <icon-refresh />
          </a-button>
          <a-button type="primary" @click="handleAddHost()" :style="{ marginBottom: '10px' }">
            {{ t('host.button.addHost') }}
          </a-button>
        </div>
        <a-table :columns="columns" :data="hostList" :loading="loading">
          <template #operations="{record}">
            <a-button type="text" size="small" @click="handleDelete(record)">
              {{ t('host.button.delete') }}
            </a-button>
          </template>
        </a-table>
      </a-card>
    </div>
    <a-modal v-model:visible="addVisible" @ok="handleAddOk" @cancel="handleAddCancel" :title="t('host.modal.title.addHost')">
      <a-tabs default-active-key="1">
        <a-tab-pane key="1" :title="t('host.modal.tab.title.singleAdd')">
          <a-form :model="form" class="custom-form">
            <a-form-item :label="t('host.form.label.ip')" field="hostIP">
              <a-input v-model="form.hostIP" :placeholder="t('host.form.placeholder.ip')" />
            </a-form-item>
            <a-form-item :label="t('host.form.label.port')">
              <a-input-number
                v-model="form.hostPort"
                :placeholder="t('host.form.placeholder.port')"
                :rules="[{ required: true, type: 'number', message: t('host.form.rule.port'), min: 1, max: 65535 }]"
              />
            </a-form-item>
            <a-form-item :label="t('host.form.label.user')" field="user">
              <a-input v-model="form.user" :placeholder="t('host.form.placeholder.user')" />
            </a-form-item>
            <a-form-item :label="t('host.form.label.password')" field="password">
              <a-input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="t('host.form.placeholder.password')"
                autocomplete="on"
              >
                <template #suffix>
                  <span @click="togglePasswordVisibility">
                    <icon-eye v-if="showPassword" />
                    <icon-eye-invisible v-else />
                  </span>
                </template>
              </a-input>
            </a-form-item>
          </a-form>
        </a-tab-pane>
        <a-tab-pane key="2" :title="t('host.modal.tab.title.batchAdd')">
          待做
        </a-tab-pane>
      </a-tabs>
    </a-modal>
    <a-modal v-model:visible="deleteVisible" @ok="handleDeleteOk" @cancel="handleDeleteCancel">
      {{ t('host.modal.delete.confirm') }}<span style="color: red; font-weight: bold;">{{ hostIP }}</span>{{ t('host.modal.delete.confirm.host') }}
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { reactive, ref } from 'vue';
import { addHost, getHostList, deleteHost } from '@/api/hosts';
import { getAllNodeList } from '@/api/node';
import useLoading from '@/hooks/loading';
import { Message } from '@arco-design/web-vue';

const { t } = useI18n();
const { loading, setLoading } = useLoading();

const addVisible = ref(false);
const deleteVisible = ref(false);
const hostList = ref([]);
const hostIP = ref();
const showPassword = ref(false);
const nodeList = ref();
const form = reactive({
  hostIP: '',
  hostPort: 22,
  user: '',
  password: '',
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

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const handleAddHost = () => {
  form.hostIP = '';
  form.hostPort = 22;
  form.user = 'root';
  form.password = '';
  addVisible.value = true;
}

const handleDelete = (record: any) => {
  deleteVisible.value = true;
  hostIP.value = record.hostIP;
}

// 检查主机是否已经存在
const isHostExist = (hostIP: string) => {
  return hostList.value.some(host => host.hostIP === hostIP);
}

const handleAddOk = async () => {

  // 检查次版本是否存在
  const versionMapStr = localStorage.getItem('k8sVersionMap');
  if (!versionMapStr) {
      Message.error(t('host.message.error.noBackend'));
      return;
  }

  const k8sVersion = getFirstK8sVersionFromStorage();
  const { hostIP } = form;
  
  if (isHostExist(hostIP)) {
    Message.warning(t('host.message.warning.hostExist', { hostIP: hostIP }));
    return;
  }

  try {
    setLoading(true);
    const result: any = await addHost(form, k8sVersion);
    if (result.status === 'ok') {
      Message.success(t('host.message.success.addHost'));
      await fetchHostList();
    } else {
      Message.error(result.msg || t('host.message.error.addHost'));
    }
  } catch (error) {
    Message.error(t('host.message.error.addHostException'));
  } finally{
    setLoading(false);
  }
};

const handleAddCancel = () => {
  addVisible.value = false;
  form.hostIP = '';
  form.hostPort = 22;
  form.user = '';
  form.password = '';
}

const handleRefresh = async () => {
  fetchHostList();
}

const handleDeleteOk = async () => {
  const isHostInUse = nodeList.value.some(node => node.ip === hostIP.value);
  
  if (isHostInUse) {
    Message.warning(t('host.message.warning.hostInUse', { hostIP: hostIP.value }));
    return;
  }

  // 检查次版本是否存在
  const versionMapStr = localStorage.getItem('k8sVersionMap');
  if (!versionMapStr) {
      Message.error(t('host.message.error.noBackend'));
      return;
  }

  try {
    const k8sVersion = getFirstK8sVersionFromStorage();
    const result: any = await deleteHost(hostIP.value, k8sVersion);
    if (result.status === 'ok') {
      Message.success(t('host.message.success.deleteHost'));
      await fetchHostList();  // 刷新主机列表
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

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const fetchNodeList = async () => {
  try {
    // 检查次版本是否存在
    const versionMapStr = localStorage.getItem('k8sVersionMap');
    if (!versionMapStr) {
        Message.error(t('host.message.error.noBackend'));
        return;
    }
    setLoading(true);
    const k8sVersion = getFirstK8sVersionFromStorage();
    const result = await getAllNodeList(k8sVersion);
    nodeList.value = result.data;
  } catch (err) {
    console.log(err);
  } finally {
    setLoading(false);
  }
};

const fetchHostList = async () => {
  try {
    // 检查次版本是否存在
    const versionMapStr = localStorage.getItem('k8sVersionMap');
    if (!versionMapStr) {
        Message.error(t('host.message.error.noBackend'));
        return;
    }  
    setLoading(true);
    const k8sVersion = getFirstK8sVersionFromStorage();
    const result = await getHostList(k8sVersion);
    hostList.value = result.data.map(item => {
      item.addtime = formatTimestamp(item.addtime);
      return item;
    });
  } catch (err) {
    console.log(err);
  } finally {
    setLoading(false);
  }
};

fetchHostList();
fetchNodeList();

const columns = [
  { title: t('host.table.header.hostIP'), dataIndex: 'hostIP' },
  { title: t('host.table.header.hostPort'), dataIndex: 'hostPort' },
  { title: t('host.table.header.os'), dataIndex: 'os' },
  { title: t('host.table.header.cpu'), dataIndex: 'cpu' },
  { title: t('host.table.header.memory'), dataIndex: 'memory' },
  { title: t('host.table.header.user'), dataIndex: 'user' },
  { title: t('host.table.header.addTime'), dataIndex: 'addtime' },
  { title: t('host.table.header.action'), dataIndex: 'operations', slotName: 'operations' },
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
.custom-form {
  margin-left: -20px;
}
.custom-form .ant-form-item-label {
  width: 120px;
  text-align: right;
}

.custom-form .ant-form-item-control {
  margin-left: 10px;
}

.custom-form .ant-form-item {
  margin-bottom: 16px;
}

.nav-btn {
  border-color: rgb(var(--gray-2));
  color: rgb(var(--gray-8));
  font-size: 16px;
}
</style>
