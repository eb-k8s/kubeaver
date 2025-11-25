import localeMessageBox from '@/components/message-box/locale/zh-CN';
import localeLogin from '@/views/login/locale/zh-CN';
import localeClusterCreate from '@/views/cluster/create/locale/zh-CN';
import localeClusterList from '@/views/cluster/list/locale/zh-CN';
import localeNode from '@/views/node/locale/zh-CN';
import localeClusterDetail from '@/views/cluster/detail/locale/zh-CN';
import localeHost from '@/views/host/locale/zh-CN';
import localeResources from '@/views/resources/list/locale/zh-CN';
import localeTask from '@/views/task/locale/zh-CN';
import localeClusterEdit from '@/views/cluster/edit/locale/zh-CN';

import localeSettings from './zh-CN/settings';

export default {
  'menu.dashboard': '仪表盘',
  'menu.server.dashboard': '仪表盘-服务端',
  'menu.server.workplace': '工作台-服务端',
  'menu.server.monitor': '实时监控-服务端',
  'menu.list': '列表页',
  'menu.result': '结果页',
  'menu.exception': '异常页',
  'menu.form': '表单页',
  'menu.profile': '详情页',
  'menu.visualization': '数据可视化',
  'menu.user': '个人中心',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': '常见问题',
  'menu.cluster': '集群管理',
  'menu.host': '主机管理',
  'menu.resources': '离线包管理',
  'navbar.docs': '文档中心',
  'navbar.action.locale': '切换为中文',
  ...localeSettings,
  ...localeMessageBox,
  ...localeLogin,
  ...localeClusterCreate,
  ...localeClusterEdit,
  ...localeClusterList,
  ...localeClusterDetail,
  ...localeHost,
  ...localeNode,
  ...localeResources,
  ...localeTask,
};
