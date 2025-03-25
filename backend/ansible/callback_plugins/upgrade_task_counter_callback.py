# callback_plugins/task_counter_callback.py
import time
from ansible.plugins.callback import CallbackBase

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    # 必须加入，否则会自动触发
    CALLBACK_NEEDS_ENABLED = True
    CALLBACK_NAME = 'upgrade_task_counter_callback'

    def __init__(self):
        super().__init__()
        self.task_count = 0  # 初始化任务计数器
        self.time_list = {"pre_process": 0.0, "upgrade master components": 0.0, "upgrade network_plugin": 0.0, "upgrade node components": 0.0, "after_check": 0.0}
        self.stage_task_list = {"pre_process": 829, "upgrade master components": 850, "upgrade network_plugin": 97, "upgrade node components": 387, "after_check": 414}
        self.signal_download_start_time = 0.0
        self.task_stage_time = 0.0
        self.current_stage_task = 0
        self.task_stage_start_time = 0.0
        self.current_stage = 'None'
        # self.upgrade_mode = 'master'
    
    def task_play_stage(self, play_name):
        if play_name == "Upgrade container engine on non-cluster nodes" or play_name == "Add worker nodes to the etcd play if needed" or play_name == "Install etcd" or play_name == "Handle upgrades to master components first to maintain backwards compat."  or play_name == "Install etcd certs on nodes if required":
            return "upgrade master components"
        elif play_name == "Finally handle worker upgrades, based on given batch size":
            return "upgrade node components"
        elif play_name == "Upgrade calico and external cloud provider on all masters, calico-rrs, and nodes" :
            return "upgrade network_plugin"
        elif play_name == "Apply resolv.conf changes now that cluster DNS is up" or play_name == "Patch Kubernetes for Windows" or play_name == "Install Calico Route Reflector" or play_name == "Install Kubernetes apps":
            return "after_check"
        else:
            return "pre_process"
    def v2_playbook_on_task_start(self, task, is_conditional):
        # 每次任务开始时增加计数
        self.task_count += 1
        self.current_stage_task += 1
        # 获取开始时间
        self.task_start_time = time.time()
        self.current_task_name = task.name

    def v2_playbook_on_play_start(self, play):
        # 记录当前 Play 名称和开始时间
        self.current_play_name = play.name
        self.play_start_time = time.time()
        # 改变当前所处阶段
        old_stage = self.current_stage
        # 输出旧阶段
        # print("以前阶段: {}".format(old_stage))
        self.current_stage = self.task_play_stage(self.current_play_name)
        # 输出新阶段
        # print("现在阶段: {}".format(self.current_stage))
        # 如果不是第一个playbook，且阶段发生变化，那么即可获取到当前阶段耗费时间
        if self.task_count != 0 and old_stage != self.current_stage:
            # 输出时间纳入统计
            # print("阶段耗时: {}".format(time.time() - self.task_stage_time))
            play_name = self.current_play_name
            play_end_time = time.time()
            elapsed_time = play_end_time - self.task_stage_start_time
            self.time_list[old_stage] = elapsed_time
        # 如果阶段发生变化
        if old_stage != self.current_stage:
            # 输出阶段发生 变换
            # print("阶段发生变换: {} -> {}".format(old_stage, self.current_stage))
            # 当前阶段耗费时间
            self.task_stage_time = time.time()
            # 当前阶段第几个task
            self.current_stage_task = 0
            # 阶段开始时间
            self.task_stage_start_time = time.time()
        #print(self.time_list)  
        
    # def v2_playbook_on_no_hosts_matched(self):
    #     if self.current_play_name == "Finally handle worker upgrades, based on given batch size":
    #         self.upgrade_mode = 'master'
    #     elif self.current_play_name == "Install etcd":
    #         self.upgrade_mode = 'node'

    def v2_runner_on_ok(self, result):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 10
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = time.time() - self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        
        play_end_time = time.time()
        elapsed_time = play_end_time - self.task_stage_time
        self.time_list[self.current_stage] = elapsed_time
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict1)
        dict2 = {"name": "upgrade master components", "time": self.time_list["upgrade master components"]}
        time_list_array.append(dict2)
        dict3 = {"name": "upgrade network_plugin", "time": self.time_list["upgrade network_plugin"]}
        time_list_array.append(dict3)
        dict4 = {"name": "upgrade node components", "time": self.time_list["upgrade node components"]}
        time_list_array.append(dict4)
        dict5 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict5)
        # 输出各阶段耗时
        print(time_list_array)
            
    def v2_runner_on_failed(self, result, ignore_errors=False):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 10
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = time.time() - self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        if not ignore_errors:
            play_end_time = time.time()
            elapsed_time = play_end_time - self.task_stage_time
            self.time_list[self.current_stage] = elapsed_time
            # 在 playbook 完成时输出总任务数
            print("Total tasks executed: {}".format(self.task_count))
            # 将输出数据转换为数组形式
            time_list_array = []
            dict1 = {"name": "pre_process", "time": self.time_list["pre_process"]}
            time_list_array.append(dict1)
            dict2 = {"name": "upgrade master components", "time": self.time_list["upgrade master components"]}
            time_list_array.append(dict2)
            dict3 = {"name": "upgrade network_plugin", "time": self.time_list["upgrade network_plugin"]}
            time_list_array.append(dict3)
            dict4 = {"name": "upgrade node components", "time": self.time_list["upgrade node components"]}
            time_list_array.append(dict4)
            dict5 = {"name": "after_check", "time": self.time_list["after_check"]}
            time_list_array.append(dict5)
            # 输出各阶段耗时
            print(time_list_array)
        else:
            play_end_time = time.time()
            elapsed_time = play_end_time - self.task_stage_time
            self.time_list[self.current_stage] = elapsed_time
            # 将输出数据转换为数组形式
            time_list_array = []
            dict1 = {"name": "pre_process", "time": self.time_list["pre_process"]}
            time_list_array.append(dict1)
            dict2 = {"name": "upgrade master components", "time": self.time_list["upgrade master components"]}
            time_list_array.append(dict2)
            dict3 = {"name": "upgrade network_plugin", "time": self.time_list["upgrade network_plugin"]}
            time_list_array.append(dict3)
            dict4 = {"name": "upgrade node components", "time": self.time_list["upgrade node components"]}
            time_list_array.append(dict4)
            dict5 = {"name": "after_check", "time": self.time_list["after_check"]}
            time_list_array.append(dict5)
            # 输出各阶段耗时
            print(time_list_array)
        
    def v2_runner_on_skipped(self, result):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 10
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = time.time() - self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        
        play_end_time = time.time()
        elapsed_time = play_end_time - self.task_stage_time
        self.time_list[self.current_stage] = elapsed_time
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict1)
        dict2 = {"name": "upgrade master components", "time": self.time_list["upgrade master components"]}
        time_list_array.append(dict2)
        dict3 = {"name": "upgrade network_plugin", "time": self.time_list["upgrade network_plugin"]}
        time_list_array.append(dict3)
        dict4 = {"name": "upgrade node components", "time": self.time_list["upgrade node components"]}
        time_list_array.append(dict4)
        dict5 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict5)
        # 输出各阶段耗时
        print(time_list_array)
        
    def v2_runner_on_unreachable(self, result):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 10
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = time.time() - self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        
        play_end_time = time.time()
        elapsed_time = play_end_time - self.task_stage_time
        self.time_list[self.current_stage] = elapsed_time
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict1)
        dict2 = {"name": "upgrade master components", "time": self.time_list["upgrade master components"]}
        time_list_array.append(dict2)
        dict3 = {"name": "upgrade network_plugin", "time": self.time_list["upgrade network_plugin"]}
        time_list_array.append(dict3)
        dict4 = {"name": "upgrade node components", "time": self.time_list["upgrade node components"]}
        time_list_array.append(dict4)
        dict5 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict5)
        # 输出各阶段耗时
        print(time_list_array)

    def v2_playbook_on_stats(self, stats):
        play_name = self.current_play_name
        play_end_time = time.time()
        elapsed_time = play_end_time - self.task_stage_time
        self.time_list[self.current_stage] = elapsed_time
        # 在 playbook 完成时输出总任务数
        print("Total tasks executed: {}".format(self.task_count))
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict1)
        dict2 = {"name": "upgrade master components", "time": self.time_list["upgrade master components"]}
        time_list_array.append(dict2)
        dict3 = {"name": "upgrade network_plugin", "time": self.time_list["upgrade network_plugin"]}
        time_list_array.append(dict3)
        dict4 = {"name": "upgrade node components", "time": self.time_list["upgrade node components"]}
        time_list_array.append(dict4)
        dict5 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict5)
        # 输出各阶段耗时
        print(time_list_array)
        #print(self.time_list)  
        # if self.upgrade_mode == 'master':
        #     self.time_list['upgrade network_plugin'] += self.time_list['upgrade node components']
        #     # 移除upgrade node components项
        #     self.time_list.pop('upgrade node components')
        # elif self.upgrade_mode == 'node':
        #     self.time_list['upgrade network_plugin'] += self.time_list['upgrade master components']
        #     self.time_list.pop('upgrade master components')
