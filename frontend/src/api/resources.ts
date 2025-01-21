import axios from 'axios';

export function getResourcesList() {
  return axios.get('/api/resources');
}

export function getResourcesDetail(package_name: string) {
  // return axios.get(`/api/resources/detail/${package_name}`);
  return axios.get<any>(`/api/resources/detail`, {
    params: { package_name },
  });
}

export function downloadConfig(id: any) {
  return axios.get<any>(`/api/config`, {
    params: { id },
  });
}
