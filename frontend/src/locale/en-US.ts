import localeMessageBox from '@/components/message-box/locale/en-US';
import localeLogin from '@/views/login/locale/en-US';
import localeClusterCreate from '@/views/cluster/create/locale/en-US';
import localeClusterList from '@/views/cluster/list/locale/en-US';
import localeNode from '@/views/node/locale/en-US';
import localeClusterDetail from '@/views/cluster/detail/locale/en-US';
import localeSettings from './en-US/settings';
import localeHost from '@/views/host/locale/en-US';
import localeResources from '@/views/resources/list/locale/en-US';
import localeTask from '@/views/task/locale/en-US';
import localeClusterEdit from '@/views/cluster/edit/locale/en-US';

export default {
  'menu.dashboard': 'Dashboard',
  'menu.server.dashboard': 'Dashboard-Server',
  'menu.server.workplace': 'Workplace-Server',
  'menu.server.monitor': 'Monitor-Server',
  'menu.list': 'List',
  'menu.result': 'Result',
  'menu.exception': 'Exception',
  'menu.form': 'Form',
  'menu.profile': 'Profile',
  'menu.visualization': 'Data Visualization',
  'menu.user': 'User Center',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': 'FAQ',
  'menu.cluster': 'Cluster Management',
  'menu.host': 'Host Management',
  'menu.resources': 'Offline Packages',
  'navbar.docs': 'Docs',
  'navbar.action.locale': 'Switch to English',
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
