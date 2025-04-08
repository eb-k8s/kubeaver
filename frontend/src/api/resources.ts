import axios from 'axios';

export function getResources() {
  return axios.get('/api/resources/offline');
}

export function downloadConfig(id: any) {
  return axios.get<any>(`/api/config`, {
    params: { id },
  });
}


