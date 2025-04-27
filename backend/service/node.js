const util = require('util');
const Redis = require('ioredis');
const { getNodeStatus, getRedis } = require('../utils/getNodeStatus');
const redisConfig = {
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT,
};

const redis = new Redis(redisConfig);

async function getAllNodeList() {
  try {
    const nodeKeys = await redis.keys(`k8s_cluster:*:hosts:*`);
    const nodes = [];
    for (const nodeKey of nodeKeys) {
      const nodeIP = nodeKey.split(':')[3];
      nodes.push({
        ip: nodeIP,
      });
    }
    // const nodeList = await redis.lrange(`k8s_cluster:*:hosts`, 0, -1); // 获取列表中的所有节点数据
    // const nodes = [];
    // for (const nodeData of nodeList) {
    //   const nodeInfo = JSON.parse(nodeData); // 解析存储的 JSON 字符串
    //   nodes.push(nodeInfo); // 将节点信息添加到节点列表中
    // }
    // 返回成功结果
    return {
      code: 20000,
      data: nodes,
      msg: "节点列表获取成功",
      status: "ok"
    };

  } catch (error) {
    console.error('Error retrieving node list from Redis:', error.message);
    return {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
}

async function getNodeList(id) {
  try {
    const nodeKeys = await redis.keys(`k8s_cluster:${id}:hosts:*`);
    //const nodeList = await redis.lrange(`k8s_cluster:${id}:hosts`, 0, -1); // 获取列表中的所有节点数据
    const nodes = [];
    for (const nodeKey of nodeKeys) {
      const nodeIP = nodeKey.split(':')[3];
      const nodeInfo = await redis.hgetall(nodeKey);
      if (!nodeInfo.role) {
        console.log(`${nodeIP}删除了！！！！！`);
        await deleteK8sClusterNode({ id, nodeIP: nodeIP }); // 调用删除节点接口
        continue; // 跳过当前循环，继续处理下一个节点
      }

      nodes.push({
        ip: nodeIP,
        ...nodeInfo
      });

      // 异步获取节点状态并更新 Redis
      (async () => {
        try {
          // 先检查主机名称是否存在
          const currentNodeInfo = await redis.hgetall(nodeKey);
          if (!currentNodeInfo.hostName) {
            return;
          }
          const updateTime = Date.now();
          const result = await getNodeStatus(id, nodeInfo.hostName, '', '');
          if (result.status) {
            // 如果 status 有值，更新 Redis 中的状态
            await redis.hset(nodeKey,
              'k8sVersion', result.version,
              'status', result.status,
              'updateTime', updateTime
            );
          } else {
            console.error(`未能获取到节点${nodeIP}状态`);
          }
        } catch (error) {
          console.error(`获取节点状态时出错: ${error.message}`);
        }
      })();
    }

    // 返回成功结果
    return {
      code: 20000,
      data: nodes,
      msg: "节点列表获取成功",
      status: "ok"
    };

  } catch (error) {
    console.error('Error retrieving node list from Redis:', error.message);
    return {
      code: 50000,
      data: "",
      msg: error.message,
      status: "error"
    };
  }
  // try {
  //   const nodeList = await redis.lrange(`k8s_cluster:${id}:hosts`, 0, -1); // 获取列表中的所有节点数据
  //   const nodes = [];
  //   for (const nodeData of nodeList) {
  //     const nodeInfo = JSON.parse(nodeData); // 解析存储的 JSON 字符串
  //     if (!nodeInfo.role) {
  //       console.log(`${nodeInfo.ip}删除了！！！！！`);
  //       await deleteK8sClusterNode({ id, nodeIP: nodeInfo.ip }); // 调用删除节点接口
  //       continue; // 跳过当前循环，继续处理下一个节点
  //     }

  //     nodes.push(nodeInfo); // 直接将节点信息添加到节点列表中

  //     // 异步获取节点状态并更新 Redis
  //     (async () => {
  //       try {
  //         // 先检查主机名称是否存在
  //         if (!nodeInfo.hostName) {
  //           return;
  //         }
  //         const updateTime = Date.now();
  //         const result = await getNodeStatus(id, nodeInfo.hostName, '', '');
  //         if (result.status) {
  //           // 如果 status 有值，更新 Redis 中的状态
  //           nodeInfo.k8sVersion = result.version;
  //           nodeInfo.status = result.status;
  //           nodeInfo.updateTime = updateTime;
  //           const updatedNodeData = JSON.stringify(nodeInfo);
  //           await redis.lset(`k8s_cluster:${id}:hosts`, nodeList.indexOf(nodeData), updatedNodeData);
  //         } else {
  //           console.error(`未能获取到节点${nodeInfo.ip}状态`);
  //         }
  //       } catch (error) {
  //         console.error(`获取节点状态时出错: ${error.message}`);
  //       }
  //     })();
  //   }
  //   // 返回成功结果
  //   return {
  //     code: 20000,
  //     data: nodes,
  //     msg: "节点列表获取成功",
  //     status: "ok"
  //   };
  // } catch (error) {
  //   console.error('Error retrieving node list from Redis:', error.message);
  //   return {
  //     code: 50000,
  //     data: "",
  //     msg: error.message,
  //     status: "error"
  //   };
  // }
}

//添加集群节点
async function addK8sClusterNode(clusterInfo) {
  try {
    const returnData = await getRedis(clusterInfo.id)
    const existingHosts = returnData.hosts || [];
    // 遍历新添加的节点
    for (const newNode of clusterInfo.hosts) {
      // 检查 hostName 和 ip 是否已经存在
      const nameExists = existingHosts.some(host => host.hostName === newNode.hostName);
      const ipExists = existingHosts.some(host => host.ip === newNode.ip);

      if (nameExists) {
        console.log(`节点 ${newNode.hostName} 已经存在于集群 ${returnData.clusterName} 中，请修改节点名称。`);
        return {
          code: 10001,
          msg: `节点 ${newNode.hostName}名称已经存在于集群 ${returnData.clusterName} 中，请修改节点名称。`,
          status: "error"
        };
      }
      if (ipExists) {
        console.log(`IP ${newNode.ip} 已经存在于集群 ${returnData.clusterName} 中。`);
        return {
          code: 10001,
          msg: `IP ${newNode.ip} 已经存在于集群 ${returnData.clusterName} 中`,
          status: "error"
        };
      }
      // 如果都不存在，添加新节点到 Redis
      const nodeKey = `k8s_cluster:${clusterInfo.id}:hosts:${newNode.ip}`;
      const createTime = Date.now();
      //查询用户名
      let hostKey = `host:${newNode.ip}`
      const hostInfo = await redis.hgetall(hostKey);
      await redis.hset(nodeKey,
        'ip', newNode.ip,
        'user', hostInfo.user,
        'hostName', newNode.hostName,
        'role', newNode.role,
        'os', hostInfo.os,
        'k8sVersion', 'Unknown',
        'status', 'Unknown',
        'createTime', createTime,
        'updateTime', createTime
      );
    }
    return {
      code: 20000,
      msg: "节点添加成功",
      status: "ok"
    };
  } catch (error) {
    console.error('添加节点时发生错误:', error.message || error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    };
  }
}

async function deleteK8sClusterNode(parameter) {
  const hashKey = `k8s_cluster:${parameter.id}:hosts:${parameter.nodeIP}`;
  try {
    const result = await redis.del(hashKey);
    if (result === 1) {
      console.log(`成功删除哈希表 ${hashKey}。`);
    } else {
      console.log(`哈希表 ${hashKey} 不存在，无法删除。`);
    }
    return {
      code: 20000,
      msg: "删除集群节点成功",
      status: "ok"
    };
  } catch (error) {
    console.error('删除哈希表时出错:', error);
    return {
      code: 50000,
      msg: error.message,
      status: "error"
    }
  }
}


module.exports = {
  getNodeList,
  addK8sClusterNode,
  deleteK8sClusterNode,
  getAllNodeList,
}