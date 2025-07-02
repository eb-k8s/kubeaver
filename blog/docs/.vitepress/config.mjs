import { defineConfig } from 'vitepress'

//import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // export default withMermaid({
  title: "Kubeaver",
  description: "Kubeaver",
  base: '/kubeaver/',
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
      { text: '文档', link: '/introduce/overview.md' },
    ],

    sidebar: [
      {
        text: '产品介绍',
        items: [
          { text: '概述', link: '/introduce/overview.md' },
          { text: '平台功能', link: '/introduce/use.md' },
          { text: '架构说明', link: '/introduce/framework.md' },
          { text: '环境要求', link: '/introduce/prepare.md' },
        ]
      },
      {
        text: 'kubeaver安装',
        items: [
          { text: '快速开始', link: '/deploy/start.md' },
          { text: '扩展说明', link: '/deploy/extend.md' },
        ]
      },
      {
        text: '离线包管理',
        items: [
          { text: '基础包功能', link: '/offline/base.md' },
          { text: '扩展包功能', link: '/offline/extend.md' },
        ]
      },
      {
        text: '集群管理',
        items: [
          { text: '集群管理', link: '/cluster/manage.md' },
        ]
      },
      {
        text: '应用管理',
        items: [
          { text: 'kubeadmin平台', link: '/app/kubeadmin.md' },
          { text: '应用导入', link: '/app/load.md' },
          { text: '应用商店', link: '/app/store.md' },
          { text: '应用部署', link: '/app/deploy.md' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/eb-k8s/kubeaver' }
    ]
  }
})
