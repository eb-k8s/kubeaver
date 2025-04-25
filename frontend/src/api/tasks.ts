import axios from 'axios';

export function getTaskList(id: any, k8sVersion: any) {
  return axios.get<any>(`/${k8sVersion}/api/k8sClusterTask`, {
    params: { id },
  });
}

export function getTaskDetail(id: any,ip: any,timestamp: any, taskType: any, k8sVersion: any) {
  return axios.get<any>(`/${k8sVersion}/api/taskInfo`, {
    params: { id, ip, timestamp, taskType},
  });
}

export function getActiveTasks(id: any, k8sVersion: any) {
  return axios.get<any>(`/${k8sVersion}/api/activeTasks`, {
    params: { id },
  });
}


export function stopTask(data: any, k8sVersion: any) {
  return axios.post<any>(`/${k8sVersion}/api/stopJob`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function removeWaitingTask(data: any, k8sVersion: any) {
  return axios.post<any>(`/${k8sVersion}/api/removeWaitingTask`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function stopTasks(data: any, k8sVersion: any) {
  return axios.post<any>(`/${k8sVersion}/api/stopJobs`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function upgradeCluster(data: any, k8sVersion: any) {
  return axios.put<any>(`/${k8sVersion}/api/upgradeK8sClusterJob`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}


