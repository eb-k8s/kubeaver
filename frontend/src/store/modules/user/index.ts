import { defineStore } from 'pinia';
import {
  login as userLogin,
  logout as userLogout,
  getUserInfo,
  LoginData,
} from '@/api/user';
import { setToken, clearToken } from '@/utils/auth';
import { removeRouteListener } from '@/utils/route-listener';
import { UserState } from './types';
import useAppStore from '../app';

const getFirstK8sVersionFromStorage = (key = 'k8sVersionList'): string => {
  const versionArrayStr = localStorage.getItem(key);
  if (versionArrayStr) {
      try {
          const versionArray = JSON.parse(versionArrayStr);
          if (Array.isArray(versionArray) && versionArray.length > 0) {
              return versionArray[0]; // 返回第一个版本
          }
      } catch (parseError) {
          console.error('版本信息解析失败:', parseError);
      }
  }
  return '';
};

const useUserStore = defineStore('user', {
  state: (): UserState => ({
    name: undefined,
    avatar: undefined,
    job: undefined,
    organization: undefined,
    location: undefined,
    email: undefined,
    introduction: undefined,
    personalWebsite: undefined,
    jobName: undefined,
    organizationName: undefined,
    locationName: undefined,
    phone: undefined,
    registrationDate: undefined,
    accountId: undefined,
    certification: undefined,
    role: '',
  }),

  getters: {
    userInfo(state: UserState): UserState {
      return { ...state };
    },
  },

  actions: {
    switchRoles() {
      return new Promise((resolve) => {
        this.role = this.role === 'user' ? 'admin' : 'user';
        resolve(this.role);
      });
    },
    // Set user's information
    setInfo(partial: Partial<UserState>) {
      this.$patch(partial);
    },

    // Reset user's information
    resetInfo() {
      this.$reset();
    },

    
    // Get user's information
    async info() {
      const k8sVersion = getFirstK8sVersionFromStorage();
      const res = await getUserInfo(k8sVersion);
      this.setInfo(res.data);
    },

    // Login
    async login(loginForm: LoginData, k8sVersion: any) {
      try {
        const res = await userLogin(loginForm, k8sVersion);
        setToken(res.data.token);
        console.log(res);
      } catch (err) {
        clearToken();
        throw err;
      }
    },
    logoutCallBack() {
      const appStore = useAppStore();
      this.resetInfo();
      clearToken();
      removeRouteListener();
      appStore.clearServerMenu();
    },
    // Logout
    async logout() {
      try {
        const k8sVersion = getFirstK8sVersionFromStorage();
        await userLogout(k8sVersion);
      } finally {
        this.logoutCallBack();
      }
    },
  },
});

export default useUserStore;
