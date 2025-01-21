import axios from 'axios';

interface Hosts {
  hostIP: string;
  hostPort: number;
  user: string;
  password: string;
}

export function addHost(data: Hosts) {
  return axios.post<Hosts>('/api/addhost', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function getHostList() {
  return axios.get('/api/hosts');
}

export function getAvailableHostList() {
  return axios.get('/api/hosts/available');
}

export function deleteHost(hostid: any) {
  return axios.delete(`/api/deletehost/${hostid}`);
}
