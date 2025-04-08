import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const RESOURCES: AppRouteRecordRaw = {
  path: '/resources',
  name: 'resources',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: '离线包',
    requiresAuth: true,
    icon: 'icon-storage',
    order: 5,
    hideInMenu: false,
    activeMenu: 'resources',
  },
  children: [
    {
      path: '',
      name: 'resources.list',
      component: () => import('@/views/resources/list/index.vue'),
      meta: {
        locale: '离线包',
        requiresAuth: true,
        roles: ['*'],
        hideInMenu: true,
        activeMenu: 'resources',
      },
    },
  ],
};

export default RESOURCES;
