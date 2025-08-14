import axios from 'axios';

export function getResources(k8sVersion: any) {
  return axios.get(`/${k8sVersion}/api/resources/offline`);
}

// export function downloadConfig(id: any, k8sVersion: any) {
//   return axios.get<any>(`/${k8sVersion}/api/config`, {
//     params: { id },
//   });
// }


