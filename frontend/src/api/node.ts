import axios from 'axios';

export function getNodeList(id: any, k8sVersion: any) {
  return axios.get<any>(`/${k8sVersion}/api/k8sClusterNodes`, {
    params: { id },
  });
}

export function getAllNodeList(k8sVersion: any) {
  return axios.get<any>(`/${k8sVersion}/api/k8sNodes`);
}

export function addNode(data: any, k8sVersion: any) {
  return axios.post<any>(`/${k8sVersion}/api/k8sClusterNode`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function joinCluster(data: any, k8sVersion: any) {
  return axios.post<any>(`/${k8sVersion}/api/k8sClusterNodeJob`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// export function removeNode(data: any) {
//     return axios.delete(`/api/k8sClusterNodeJob/${data}`);
// }

export function removeNode(data: any, k8sVersion: any) {
  return axios.delete(`/${k8sVersion}/api/k8sClusterNodeJob`, {
    params: {
      id: data.id,
      nodeIP: data.ip,
    },
  });
}

export function deleteNode(data: any, k8sVersion: any) {
  return axios.delete(`/${k8sVersion}/api/k8sClusterNode`, {
    params: {
      id: data.id,
      nodeIP: data.ip,
    },
  });
}
