<template>
    <div class="container">
        <a-breadcrumb :style="{fontSize: '14px', marginTop: '24px', marginBottom: '24px'}">
            <a-breadcrumb-item>
                <icon-apps />
            </a-breadcrumb-item>
            <a-breadcrumb-item>离线包管理</a-breadcrumb-item>
        </a-breadcrumb>
        <div class="layout">
            <a-card :style="{ marginBottom: '24px' }">
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
                <a-row :gutter="16">
                    <a-col :span="12" :style="{ padding: '0 8px' }">
                        <a-card title="k8s版本" :style="{ marginBottom: '16px' }">
                            <a-collapse accordion>
                                <a-collapse-item v-for="version in k8sCache?.children || []" :key="version.name" :header="version.name">
                                    <a-tabs default-active-key="files">
                                        <a-tab-pane key="files" title="文件">
                                            <a-table
                                                :columns="fileColumns"
                                                :data="version.children.filter(item => item.type === 'file')"
                                                :pagination="false"
                                                :loading="loading"
                                                row-key="name"
                                            />
                                        </a-tab-pane>
                                        <a-tab-pane key="image" title="镜像">
                                            <a-table
                                                :columns="imageColumns"
                                                :data="version.children
                                                    .find(item => item.type === 'directory' && item.name === 'images')?.children || []"
                                                :pagination="false"
                                                :loading="loading"
                                                row-key="name"
                                            />
                                        </a-tab-pane>
                                    </a-tabs>
                                </a-collapse-item>
                            </a-collapse>
                        </a-card>
                    </a-col>
                    <a-col :span="12" :style="{ padding: '0 8px' }">
                        <a-card title="网络插件" :style="{ marginBottom: '16px' }"> 
                            <a-collapse accordion>
                                <a-collapse-item v-for="plugin in formattedPlugins" :key="plugin.name + plugin.version" :header="`${plugin.name} - ${plugin.version}`">
                                    <a-tabs default-active-key="images">
                                        <a-tab-pane key="images" title="镜像">
                                            <a-table
                                                :columns="imageColumns"
                                                :data="plugin.images"
                                                :pagination="false"
                                                :loading="loading"
                                                row-key="name"
                                            />
                                        </a-tab-pane>
                                        <a-tab-pane key="files" title="文件">
                                            <a-table
                                                :columns="fileColumns"
                                                :data="plugin.files"
                                                :pagination="false"
                                                :loading="loading"
                                                row-key="name"
                                            />
                                        </a-tab-pane>
                                    </a-tabs>
                                </a-collapse-item>
                            </a-collapse>
                        </a-card>
                    </a-col>
                </a-row>
                <a-row :gutter="16" style="margin-top: 24px;">
                    <a-col :span="12" :style="{ padding: '0 8px' }">
                        <a-card title="操作系统" :style="{ marginBottom: '16px' }">
                        <a-collapse accordion>
                            <a-collapse-item
                            v-for="(directory, index) in repoFiles"
                            :key="index"
                            :header="directory.name"
                            >
                            <a-table :columns="fileColumns" :data="directory.children" :loading="loading" row-key="name">
                                <template #package_name="{ record }">
                                <a-link @click="onClickView(record)">{{ record.name }}</a-link>
                                </template>
                                <template #operating_system="{ record }">
                                <div>
                                    <ul class="os-list">
                                    <li v-for="(os, idx) in record.operating_system.split(',')" :key="idx">
                                        {{ os.trim() }}
                                    </li>
                                    </ul>
                                </div>
                                </template>
                            </a-table>
                            </a-collapse-item>
                        </a-collapse>
                        </a-card>
                    </a-col>
                    <a-col :span="12" :style="{ padding: '0 8px' }">
                        <a-card title="系统软件" :style="{ marginBottom: '16px' }">
                            <a-collapse accordion>
                                <a-collapse-item v-for="app in systemApp" :key="app.name" :header="app.name">
                                    <a-tabs default-active-key="images">
                                        <a-tab-pane key="images" title="镜像">
                                            <a-table
                                                :columns="imageColumns"
                                                :data="getChildrenData(app.images)"
                                                :pagination="false"
                                                :loading="loading"
                                                row-key="name"
                                            />
                                        </a-tab-pane>
                                        <a-tab-pane key="files" title="文件">
                                            <a-table
                                                :columns="fileColumns"
                                                :data="getChildrenData(app.files)"
                                                :pagination="false"
                                                :loading="loading"
                                                row-key="name"
                                            />
                                        </a-tab-pane>
                                    </a-tabs>
                                </a-collapse-item>
                            </a-collapse>
                        </a-card>
                    </a-col>
                </a-row>
            </a-card>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted, computed } from 'vue';
    import router from '@/router';
    import useLoading from '@/hooks/loading';
    import { getResources } from '@/api/resources';

    const { loading, setLoading } = useLoading();
    const k8sCache = ref(null)
    const networkPlugins = ref(null)
    const repoFiles = ref(null)
    const systemApp = ref(null)

    const onClickView = (record: { package_name: string; id: number }) => {
        router.push({
            path: `/resources/detail`,
            query: { package_name: record.package_name }
        });
    };

    const handleRefresh = async () =>{
        fetchResourcesList();
    }

    const fetchResourcesList = async () => {
        try {
            setLoading(true);
            const result: any = await getResources();
            result.data.forEach(item => {
                if (item.name === 'k8s_cache') {
                    k8sCache.value = item
                } else if (item.name === 'network_plugins') {
                    networkPlugins.value = item
                } else if (item.name === 'repo_files') {
                    repoFiles.value = extractOperatingSystems(item);
                } else if (item.name === 'system_app') {
                    systemApp.value = formatSystemAppData(item);
                }
            })
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const formattedPlugins = computed(() => {
        if (!networkPlugins.value || !networkPlugins.value.children) return [];

        return networkPlugins.value.children.map(plugin => {
            const versionNode = plugin.children?.[0]; 
            const imagesNode = versionNode?.children?.find(child => child.name === 'images');

            return {
            name: plugin.name,        
            version: versionNode?.name,  
            images: imagesNode?.children || [],

            files: versionNode?.children
                ?.filter(child => child.name !== 'images' && child.type === 'file') || []
            };
        });
    });

    const formatSystemAppData = (node) => {
        const formatted = [];

        if (node.type === 'directory' && node.children) {
            node.children.forEach(groupNode => {
                const group = {
                    name: groupNode.name, 
                    files: [],
                    images: []
                };

                // 递归处理每个子项
                const processChildren = (children) => {
                    children.forEach(child => {
                        if (child.name === 'images') {
                            group.images.push(child);
                        } else if (child.name === 'files') {
                            group.files.push(child);
                        } else if (child.type === 'directory' && child.children) {
                            processChildren(child.children); 
                        }
                    });
                };

                processChildren(groupNode.children);
                formatted.push(group);
            });
        }

        return formatted;
    };

    const extractOperatingSystems = (repoFiles: any) => {
        if (repoFiles && repoFiles.children) {
            return repoFiles.children.map(directory => {
                return {
                    name: directory.name, 
                    children: directory.children 
                };
            });
        }
        return [];
    };

    const getChildrenData = (data) => {
        return data.length > 0 && data[0].children ? data[0].children : [];
    };

    onMounted(async () => {

        fetchResourcesList();
    })

    const fileColumns = [
        { title: '文件名', dataIndex: 'name', key: 'name' },
        { title: '大小', dataIndex: 'size', key: 'size' },
    ];

    const imageColumns = [
        { title: '镜像名', dataIndex: 'name', key: 'name' },
        { title: '大小', dataIndex: 'size', key: 'size' },
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
