import { defineConfig } from 'vitepress'

//import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // export default withMermaid({
  title: "Kubeaver",
  description: "Kubeaver",
  vite: {
    build: {
      chunkSizeWarningLimit: Infinity, // 调整警告阈值为 1000 kB
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.toString().split('node_modules/')[1].split('/')[0].toString();
            }
          }
        }
      }
    }
  },
  themeConfig: {
    //https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '文档', link: '/kubeaver/introduce/overview.md' },
    ],

    sidebar: [
      {
        text: '产品介绍',
        items: [
          { text: '概述', link: '/kubeaver/introduce/overview.md' },
          { text: '平台功能', link: '/kubeaver/introduce/use.md' },
          { text: '架构说明', link: '/kubeaver/introduce/framework.md' },
          { text: '环境要求', link: '/kubeaver/introduce/prepare.md' },
        ]
      },
      {
        text: 'kubeaver安装',
        items: [
          { text: '快速开始', link: '/kubeaver/deploy/start.md' },
          { text: '扩展说明', link: '/kubeaver/deploy/extend.md' },
        ]
      },
      {
        text: '离线包管理',
        items: [
          { text: '基础包功能', link: '/kubeaver/offline/base.md' },
          { text: '扩展包功能', link: '/kubeaver/offline/extend.md' },
        ]
      },
      {
        text: '集群管理',
        items: [
          { text: '集群管理', link: '/kubeaver/cluster/manage.md' },
        ]
      },
      {
        text: '应用管理',
        items: [
          { text: 'kubeadmin平台', link: '/kubeaver/app/kubeadmin.md' },
          { text: '应用导入', link: '/kubeaver/app/load.md' },
          { text: '应用商店', link: '/kubeaver/app/store.md' },
          { text: '应用部署', link: '/kubeaver/app/deploy.md' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/eb-k8s/kubeaver' }
    ]
  }
})
