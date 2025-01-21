import axios from 'axios';

export function getTaskList(id: any) {
  return axios.get<any>(`/api/k8sClusterTask`, {
    params: { id },
  });
}

export function getTaskDetail(id: any,ip: any,timestamp: any, taskType: any) {
  return axios.get<any>(`/api/taskInfo`, {
    params: { id, ip, timestamp, taskType},
  });
}

export function getActiveTasks(id: any) {
  return axios.get<any>(`/api/activeTasks`, {
    params: { id },
  });
}

export function stopTask(data: any) {
  return axios.post<any>('/api/stopJob', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function removeWaitingTask(data: any) {
  return axios.post<any>('/api/removeWaitingTask', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function stopTasks(data: any) {
  return axios.post<any>('/api/stopJobs', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function upgradeCluster(data: any) {
  return axios.put<any>('/api/upgradeK8sClusterJob', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}


