import axios from 'axios';

interface Hosts {
  hostIP: string;
  hostPort: number;
  user: string;
  password: string;
}

export function addHost(data: Hosts, k8sVersion: any) {
  return axios.post<Hosts>(`/${k8sVersion}/api/addhost`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function getHostList(k8sVersion: any) {
  return axios.get(`/${k8sVersion}/api/hosts`);
}

export function getAvailableHostList(k8sVersion: any) {
  return axios.get(`/${k8sVersion}/api/hosts/available`);
}

export function deleteHost(hostid: any, k8sVersion: any) {
  return axios.delete(`/${k8sVersion}/api/deletehost/${hostid}`);
}
