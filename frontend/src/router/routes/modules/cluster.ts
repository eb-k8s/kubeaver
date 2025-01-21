import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const CLUSTER: AppRouteRecordRaw = {
  path: '/cluster',
  name: 'cluster',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: '集群管理',
    requiresAuth: true,
    icon: 'icon-relation',
    order: 1,
    hideInMenu: false,
    activeMenu: 'cluster',
  },
  children: [
    {
      path: '',
      name: 'cluster.list',
      component: () => import('@/views/cluster/list/index.vue'),
      meta: {
        locale: '集群管理',
        requiresAuth: true,
        roles: ['*'],
        hideInMenu: true,
        activeMenu: 'cluster',
      },
    },
    {
      path: '/cluster/create',
      name: 'cluster.create',
      component: () => import('@/views/cluster/create/index.vue'),
      meta: {
        locale: '集群管理',
        requiresAuth: true,
        roles: ['*'],
        hideInMenu: true,
        activeMenu: 'cluster',
      },
    },
    {
      path: '/cluster/edit/:name',
      name: 'cluster.edit',
      component: () => import('@/views/cluster/edit/index.vue'),
      meta: {
        locale: '集群管理',
        requiresAuth: true,
        roles: ['*'],
        hideInMenu: true,
        activeMenu: 'cluster',
      },
    },
    {
      path: '/cluster/detail/:name',
      name: 'cluster.detail',
      component: () => import('@/views/cluster/detail/index.vue'),
      meta: {
        locale: '集群管理',
        requiresAuth: true,
        roles: ['*'],
        hideInMenu: true,
        activeMenu: 'cluster',
      },
    },
  ],
};

export default CLUSTER;

// const CLUSTER: AppRouteRecordRaw = {
//   path: '/cluster',
//   name: 'cluster',
//   component: DEFAULT_LAYOUT,
//   meta: {
//     locale: '集群管理',
//     requiresAuth: true,
//     icon: 'icon-home',
//     order: 1,
//     hideInMenu: false, // 父菜单可见
//   },
//   children: [
//     {
//       path: 'list',
//       name: 'cluster.list',
//       component: () => import('@/views/cluster/list/index.vue'),
//       meta: {
//         locale: '集群列表',
//         requiresAuth: true,
//         roles: ['*'],
//         hideInMenu: true, // 隐藏在菜单中
//         activeMenu: 'cluster',
//       },
//     },
//     {
//       path: 'create',
//       name: 'cluster.create',
//       component: () => import('@/views/cluster/create/index.vue'),
//       meta: {
//         locale: '创建集群',
//         requiresAuth: true,
//         roles: ['*'],
//         hideInMenu: true, // 隐藏在菜单中
//         activeMenu: 'cluster',
//       },
//     },
//     {
//       path: 'detail/:name',
//       name: 'cluster.detail',
//       component: () => import('@/views/cluster/detail/index.vue'),
//       meta: {
//         locale: '集群详情',
//         requiresAuth: true,
//         roles: ['*'],
//         hideInMenu: true, // 隐藏在菜单中
//         activeMenu: 'cluster',
//       },
//     },
//   ],
// };

// export default CLUSTER;
