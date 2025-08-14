import axios from 'axios';

export function createCluster(data: any, k8sVersion: any) {
  return axios.post<any>(`/${k8sVersion}/api/k8sCluster`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function editCluster(data: any, k8sVersion: any) {
  return axios.put<any>(`/${k8sVersion}/api/k8sCluster`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function deployCluster(data: any, k8sVersion: any) {
  return axios.post<any>(
    `/${k8sVersion}/api/k8sClusterMasterJob`, data,
    // { data: data },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

export function resetCluster(id: any, k8sVersion: any) {
  return axios.delete<any>(`/${k8sVersion}/api/resetK8sClusterJob`,{
    params: { id },
  });
}

export function getClusterList(k8sVersion: any) {
  return axios.get(`/${k8sVersion}/api/k8sCluster`);
}

export function downloadConfig(id: any, k8sVersion: any) {
  return axios.get<any>(`/${k8sVersion}/api/config`, {
    params: { id },
  });
}

export function deleteBeforeDeployCluster(id: any, k8sVersion: any) {
  return axios.delete<any>(`/${k8sVersion}/api/k8sCluster`, {
    params: { id },
  });
}

