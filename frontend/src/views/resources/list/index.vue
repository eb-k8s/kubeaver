<template>
    <div class="container">
        <a-breadcrumb :style="{fontSize: '14px', marginTop: '16px', marginBottom: '16px'}">
        <a-breadcrumb-item>
            <icon-apps />
        </a-breadcrumb-item>
        <a-breadcrumb-item>离线包管理</a-breadcrumb-item>
        </a-breadcrumb>
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button 
                        type="text" 
                        size="small" 
                        @click="handleLink">
                        离线包导入
                    </a-button>
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleRefresh()" :style="{ marginRight: '10px', marginBottom: '10px' }">
                        <icon-refresh />
                    </a-button>
                </div>
                <a-table :columns="columns" :data="resourceList" :loading="loading">
                    <template #package_name="{ record }">
                        <a-link @click="onClickView(record)">{{ record.package_name }}</a-link>
                    </template>
                    <template #operating_system="{ record }">
                        <div>
                            <ul class="os-list">
                            <li v-for="(os, index) in record.operating_system.split(',')" :key="index">
                                {{ os.trim() }}
                            </li>
                            </ul>
                        </div>
                    </template>
                </a-table>
            </a-card>
        </div>
    </div>
</template>
<script lang="ts" setup>
    import { ref, onMounted } from 'vue';
    import router from '@/router';
    import useLoading from '@/hooks/loading';
    import { getResourcesList } from '@/api/resources';

    const { loading, setLoading } = useLoading();
    const resourceList = ref();

    const onClickView = (record: { package_name: string; id: number }) => {
        router.push({
            path: `/resources/detail`,
            query: { package_name: record.package_name }
        });
    };

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const handleRefresh = async () =>{
        fetchResourcesList();
    }

    const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const result = await getResourcesList();
            resourceList.value = result.data.map(item => {
                item.import_time = formatTimestamp(item.import_time);
                return item;
            });
            // resourceList.value = result.data;
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    onMounted(async () => {

        fetchResourcesList();
    })

    const columns = [
        {
            title: '离线包',
            dataIndex: 'package_name',
            slotName: 'package_name',
        },
        {
            title: '版本',
            dataIndex: 'kube_version',
        },
        {
            title: '容器引擎',
            dataIndex: 'container_engine',
            slotName: 'container_engine',
        },
        {
            title: '操作系统',
            dataIndex: 'operating_system',
            slotName: 'operating_system',
            customCell: () => ({
                style: { textAlign: 'center', verticalAlign: 'middle' },
            }),
        },
        {
            title: '离线包大小',
            dataIndex: 'packageSize',
        },
        {
            title: '导入时间',
            dataIndex: 'import_time',
        },
    ];

    // 跳转离线包导入
    const handleLink = () => {
        const url = `/apploader`;
        window.open(url, '_blank');
    };

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
    /* 设置列表外观 */
.os-list {
  list-style: none; /* 移除默认圆点 */
  padding-left: 0; /* 去除左侧填充 */
  margin: 0; /* 去除默认外边距 */
}

/* 定义列表项样式 */
.os-list li {
  word-break: break-word;
  white-space: normal;
  margin: 4px 0; /* 每行的间距 */
  padding-left: 16px; /* 为伪元素留出空间 */
  position: relative; /* 设置相对定位以支持伪元素 */
}

/* 自定义圆点样式 */
.os-list li::before {
  content: ""; /* 添加内容 */
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%); /* 垂直居中对齐 */
  width: 6px; /* 圆点大小 */
  height: 6px; /* 圆点大小 */
  background-color: rgb(106, 141, 244); /* 圆点颜色 */
  border-radius: 50%; /* 圆点形状 */
}
</style>
<!-- <template>
    <div class="container">
        <a-breadcrumb :style="{ fontSize: '14px', marginTop: '16px', marginBottom: '16px' }">
            <a-breadcrumb-item>
                <icon-apps />
            </a-breadcrumb-item>
            <a-breadcrumb-item>离线包管理</a-breadcrumb-item>
        </a-breadcrumb>
        <div class="layout">
            <a-card>
                <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <a-button
                        class="nav-btn"
                        type="outline"
                        :shape="'circle'"
                        @click="handleRefresh()"
                        :style="{ marginRight: '10px', marginBottom: '10px' }"
                    >
                        <icon-refresh />
                    </a-button>
                </div>
                <a-table :columns="columns" :data="resourceList" :loading="loading">
                    <template #package_name="{ record }">
                        <a-link @click="onClickView(record)">{{ record.package_name }}</a-link>
                    </template>
                    <template #operating_system="{ record }">
                        <div>
                            <ul class="os-list">
                                <li v-for="(os, index) in record.operating_system.split(',')" :key="index">
                                    <img
                                        v-if="getOsIcon(os.trim())"
                                        :src="getOsIcon(os.trim())"
                                        alt="OS Icon"
                                        style="width: 16px; height: 16px; margin-right: 8px;"
                                    />
                                    <span>{{ os.trim() }}</span>
                                </li>
                            </ul>
                        </div>
                    </template>
                </a-table>
            </a-card>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted } from 'vue';
    import router from '@/router';
    import useLoading from '@/hooks/loading';
    import { getResourcesList } from '@/api/resources';

    const { loading, setLoading } = useLoading();
    const k8sLogos = ref({});
    const osLogos = ref({});
    const resourceList = ref();

    // 路由跳转
    const onClickView = (record: { package_name: string; id: number }) => {
        router.push({
            path: `/resources/detail/${record.package_name}`,
        });
    };

    // 时间戳格式化
    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // 数据刷新
    const handleRefresh = async () => {
        fetchResourcesList();
    };

    // 获取资源列表
    const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const result = await getResourcesList();
            resourceList.value = result.data.map((item) => {
                item.import_time = formatTimestamp(item.import_time);
                return item;
            });
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    onMounted(async () => {
        // 操作系统图标
        osLogos.value = {
            openEuler: (await import('@/assets/images/logo/openEuler.png')).default,
            'Rocky-Linux': (await import('@/assets/images/logo/rocky.png')).default,
        };

    });

    // 获取图标方法
    const getOsIcon = (osName: string) => {
        if (osName.startsWith('openEuler')) return osLogos.value['openEuler'];
        if (osName.startsWith('Rocky-Linux')) return osLogos.value['Rocky-Linux'];
        return null; // 默认返回空
    };

    // 初始化表格数据
    fetchResourcesList();

    // 表格列定义
    const columns = [
        {
            title: '离线包',
            dataIndex: 'package_name',
            slotName: 'package_name',
        },
        {
            title: '版本',
            dataIndex: 'kube_version',
            slotName: 'kube_version',
        },
        {
            title: '容器引擎',
            dataIndex: 'container_engine',
            slotName: 'container_engine',
        },
        {
            title: '操作系统',
            dataIndex: 'operating_system',
            slotName: 'operating_system',
            customCell: () => ({
                style: { textAlign: 'center', verticalAlign: 'middle' },
            }),
        },
        {
            title: '导入时间',
            dataIndex: 'import_time',
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

    .os-list {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }

    .os-list li {
        word-break: break-word;
        white-space: normal;
        margin: 4px 0;
        padding-left: 0; 
        display: flex; 
        align-items: center;
    }
</style> -->
