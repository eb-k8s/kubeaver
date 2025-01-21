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
                <!-- <a-form-item label="端口" field="hostPort">
                    <a-input v-model="form.hostPort" placeholder="请输入主机端口" />
                </a-form-item> -->
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
            确定删除这台主机吗？
        </a-modal>
    </div>
</template>
  
  <script lang="ts" setup>
    import { reactive, ref } from 'vue';
    import { addHost, getHostList, deleteHost } from '@/api/hosts';
    import useLoading from '@/hooks/loading';
    import { Message } from '@arco-design/web-vue';
  
    const { loading, setLoading } = useLoading();
  
    
    const addVisible = ref(false);
    const deleteVisible = ref(false);
    const hostList = ref([]);
    const hostIP = ref(); 
    const showPassword = ref(false); 
    const form = reactive({
      hostIP: '',
      hostPort: 22,
      user: '',
      password: '',
    });

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
  
    const handleAddOk = async () => {
      const result: any = await addHost(form);
      if(result.status === 'ok'){
        Message.success("主机添加成功，正在获取详细信息...");
        await fetchHostList();
      }
    }
  
    const handleAddCancel = () => {
      addVisible.value = false;
      form.hostIP = '';
      form.hostPort = 22;
      form.user = '';
      form.password = '';
    }

    const handleRefresh = async () =>{
      fetchHostList();
    }
    
    const handleDeleteOk = async () => {
      try {
        const result: any = await deleteHost(hostIP.value);
        if(result.status === 'ok'){
          Message.success("删除成功！");
          await fetchHostList();
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
  
    const fetchHostList = async () => {
      try {
        setLoading(true);
        const result = await getHostList();
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
  
    const columns = [
      // { title: '主机名称', dataIndex: 'hostname' },
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
      margin-left: -20px; /* 向左移动表单 */
    }
    .custom-form .ant-form-item-label {
      width: 120px; /* 设置标签的宽度 */
      text-align: right; /* 标签文本右对齐 */
    }
  
    .custom-form .ant-form-item-control {
      margin-left: 10px; /* 设置输入框的左边距 */
    }
  
    .custom-form .ant-form-item {
      margin-bottom: 16px; /* 设置每个表单项的下边距 */
    }

    .nav-btn {
      border-color: rgb(var(--gray-2));
      color: rgb(var(--gray-8));
      font-size: 16px;
    }
  </style>
  