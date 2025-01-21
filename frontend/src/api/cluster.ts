import axios from 'axios';

export function createCluster(data: any) {
  return axios.post<any>('/api/k8sCluster', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function editCluster(data: any) {
  return axios.put<any>('/api/k8sCluster', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}


export function deployCluster(id: any) {
  return axios.post<any>(
    '/api/k8sClusterMasterJob',
    { id: id },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

export function resetCluster(id: any) {
  return axios.delete<any>('/api/resetK8sClusterJob',{
    params: { id },
  });
}

export function getClusterList() {
  return axios.get('/api/k8sCluster');
}

export function downloadConfig(id: any) {
  return axios.get<any>(`/api/config`, {
    params: { id },
  });
}

export function deleteBeforeDeployCluster(id: any) {
  return axios.delete<any>(`/api/k8sCluster`, {
    params: { id },
  });
}

