<template>
  <div class="container">
    <a-breadcrumb :style="{fontSize: '14px', marginTop: '16px', marginBottom: '16px'}">
      <a-breadcrumb-item>
        <icon-apps />
      </a-breadcrumb-item>
      <a-breadcrumb-item>主机管理</a-breadcrumb-item>
    </a-breadcrumb>
    <div class="layout">
      <a-card>
        <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
          <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
              <icon-refresh />
          </a-button>
          <a-button type="primary" @click="handleAddHost()" :style="{ marginBottom: '10px' }">
            添加主机
          </a-button>
        </div>
        <a-table :columns="columns" :data="hostList" :loading="loading">
          <template #operations="{record}">
            <a-button type="text" size="small" @click="handleDelete(record)">
              删除
            </a-button>
          </template>
        </a-table>
      </a-card>
    </div>
    <a-modal v-model:visible="addVisible" @ok="handleAddOk" @cancel="handleAddCancel" title="主机添加">
      <a-tabs default-active-key="1">
        <a-tab-pane key="1" title="单个添加">
          <a-form :model="form" class="custom-form">
            <a-form-item label="IP" field="hostIP">
              <a-input v-model="form.hostIP" placeholder="请输入主机IP" />
            </a-form-item>
            <a-form-item label="端口号">
              <a-input-number
                v-model="form.hostPort"
                placeholder="请输入端口号"
                :rules="[{ required: true, type: 'number', message: '请输入1-65535之间的整数', min: 1, max: 65535 }]"
              />
            </a-form-item>
            <a-form-item label="用户" field="user">
              <a-input v-model="form.user" placeholder="请输入主机的用户" />
            </a-form-item>
            <a-form-item label="密码" field="password">
              <a-input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入主机的密码"
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
        <a-tab-pane key="2" title="批量添加">
          待做
        </a-tab-pane>
      </a-tabs>
    </a-modal>
    <a-modal v-model:visible="deleteVisible" @ok="handleDeleteOk" @cancel="handleDeleteCancel">
      确定删除<span style="color: red; font-weight: bold;">{{ hostIP }}</span>这台主机吗？
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { addHost, getHostList, deleteHost } from '@/api/hosts';
import { getAllNodeList } from '@/api/node';
import useLoading from '@/hooks/loading';
import { Message } from '@arco-design/web-vue';

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
      Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
      return;
  }

  const k8sVersion = getFirstK8sVersionFromStorage();
  const { hostIP } = form;
  
  if (isHostExist(hostIP)) {
    Message.warning(`主机 ${hostIP} 已经存在！`);
    return;
  }

  try {
    setLoading(true);
    const result: any = await addHost(form, k8sVersion);
    if (result.status === 'ok') {
      Message.success('主机添加成功!');
      await fetchHostList();
    } else {
      Message.error(result.msg || '添加主机失败');
    }
  } catch (error) {
    Message.error('添加主机时发生异常');
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
    Message.warning(`主机 ${hostIP.value} 正在被使用，无法删除！`);
    return;
  }

  // 检查次版本是否存在
  const versionMapStr = localStorage.getItem('k8sVersionMap');
  if (!versionMapStr) {
      Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
      return;
  }

  try {
    const k8sVersion = getFirstK8sVersionFromStorage();
    const result: any = await deleteHost(hostIP.value, k8sVersion);
    if (result.status === 'ok') {
      Message.success("删除成功！");
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
        Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
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
        Message.error("未检测到可用的后端，请启动后端后退出重新登录！");
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
  { title: '主机IP', dataIndex: 'hostIP' },
  { title: '主机端口', dataIndex: 'hostPort' },
  { title: '操作系统', dataIndex: 'os' },
  { title: 'CPU（核）', dataIndex: 'cpu' },
  { title: '内存（GB）', dataIndex: 'memory' },
  { title: '用户', dataIndex: 'user' },
  { title: '加入时间', dataIndex: 'addtime' },
  { title: '操作', dataIndex: 'operations', slotName: 'operations' },
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
