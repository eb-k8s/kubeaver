import axios from 'axios';
import type { RouteRecordNormalized } from 'vue-router';
import { UserState } from '@/store/modules/user/types';
//const apiVersion: string = import.meta.env.VITE_API_VERSION
export interface LoginData {
  username: string;
  password: string;
}

export interface LoginRes {
  token: string;
}
export function login(data: LoginData, k8sVersion: any) {
  return axios.post<LoginRes>(`/${k8sVersion}/api/user/login`, data);
  // return axios.get<any>(`/v125/api/backend/available`)
}

export function availableBackend(mappedVersion: string) {
  return axios.get<any>(`/${mappedVersion}/api/backend/available`);
}

export function logout(k8sVersion: string) {
  return axios.post<LoginRes>(`${k8sVersion}/api/user/logout`);
}

export function getUserInfo(k8sVersion: string) {
  return axios.post<UserState>(`/${k8sVersion}/api/user/info`);
}

export function getMenuList() {
  return axios.post<RouteRecordNormalized[]>('/api/user/menu');
}

export function getVersions() {
  return axios.get<any>('/api/versions');
}

export function getTest(api: any) {
  return axios.get<any>(`/${api}/user/test`);
}
