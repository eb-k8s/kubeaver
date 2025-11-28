import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const HOST: AppRouteRecordRaw = {
  path: '/host',
  name: 'host',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.host',
    requiresAuth: true,
    icon: 'icon-computer',
    order: 3,
    hideInMenu: false,
  },
  children: [
    {
      path: '',
      name: 'host.list',
      component: () => import('@/views/host/index.vue'),
      meta: {
        locale: 'menu.host',
        requiresAuth: true,
        roles: ['*'],
        hideInMenu: true,
        activeMenu: 'host',
      },
    },
  ],
};

export default HOST;
