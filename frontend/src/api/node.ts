import axios from 'axios';

export function getNodeList(id: any) {
  return axios.get<any>(`/api/k8sClusterNodes`, {
    params: { id },
  });
}

export function getAllNodeList() {
  return axios.get<any>(`/api/k8sNodes`);
}

export function addNode(data: any) {
  return axios.post<any>('/api/k8sClusterNode', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function joinCluster(data: any) {
  return axios.post<any>('/api/k8sClusterNodeJob', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// export function removeNode(data: any) {
//     return axios.delete(`/api/k8sClusterNodeJob/${data}`);
// }

export function removeNode(data: any) {
  return axios.delete('/api/k8sClusterNodeJob', {
    params: {
      id: data.id,
      nodeIP: data.ip,
    },
  });
}

export function deleteNode(data: any) {
  return axios.delete('/api/k8sClusterNode', {
    params: {
      id: data.id,
      nodeIP: data.ip,
    },
  });
}
