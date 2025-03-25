# callback_plugins/task_counter_callback.py
import time
from ansible.plugins.callback import CallbackBase

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    # 必须加入，否则会自动触发
    CALLBACK_NEEDS_ENABLED = True
    CALLBACK_NAME = 'add_task_counter_callback'

    def __init__(self):
        super().__init__()
        self.task_count = 0  # 初始化任务计数器
        self.time_list = {"reset": 0.0, "pre_process": 0.0, "download": 0.0, "add to cluster": 0.0, "install network_plugin": 0.0, "after_check": 0.0}
        self.stage_task_list = {"reset": 25, "pre_process": 72, "download": 851, "add to cluster": 65, "install network_plugin": 95, "after_check": 174}
        self.signal_download_start_time = 0.0
        self.task_stage_time = 0.0
        self.current_stage_task = 0
        self.task_stage_start_time = 0.0
        self.current_stage = 'None'
    
    def task_play_stage(self, play_name):
        if play_name == "force delete node" or play_name == "Confirm node removal":                                 
            return "reset"
        elif play_name == "Target only workers to get kubelet installed and checking in on any new nodes(engine)":
            return "download"
        elif play_name == "Target only workers to get kubelet installed and checking in on any new nodes(node)" or play_name == "Upload control plane certs and retrieve encryption key":
            return "add to cluster"
        elif play_name == "Target only workers to get kubelet installed and checking in on any new nodes(network)":
            return "install network_plugin"
        elif play_name == "Apply resolv.conf changes now that cluster DNS is up":
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
        # print(self.time_list) 

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
        task_result['task_stage_counts'] = self.stage_task_list[self.current_stage]
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
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        dict2 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict2)
        dict3 = {"name": "download", "time": self.time_list["download"]}
        time_list_array.append(dict3)
        dict4 = {"name": "add to cluster", "time": self.time_list["add to cluster"]}
        time_list_array.append(dict4)
        dict5 = {"name": "install network_plugin", "time": self.time_list["install network_plugin"]}
        time_list_array.append(dict5)
        dict6 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict6)
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
        task_result['task_stage_counts'] = self.stage_task_list[self.current_stage]
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
            dict1 = {"name": "reset", "time": self.time_list["reset"]}
            time_list_array.append(dict1)
            dict2 = {"name": "pre_process", "time": self.time_list["pre_process"]}
            time_list_array.append(dict2)
            dict3 = {"name": "download", "time": self.time_list["download"]}
            time_list_array.append(dict3)
            dict4 = {"name": "add to cluster", "time": self.time_list["add to cluster"]}
            time_list_array.append(dict4)
            dict5 = {"name": "install network_plugin", "time": self.time_list["install network_plugin"]}
            time_list_array.append(dict5)
            dict6 = {"name": "after_check", "time": self.time_list["after_check"]}
            time_list_array.append(dict6)
            print(time_list_array)
        else:
            play_end_time = time.time()
            elapsed_time = play_end_time - self.task_stage_time
            self.time_list[self.current_stage] = elapsed_time
            # 将输出数据转换为数组形式
            time_list_array = []
            dict1 = {"name": "reset", "time": self.time_list["reset"]}
            time_list_array.append(dict1)
            dict2 = {"name": "pre_process", "time": self.time_list["pre_process"]}
            time_list_array.append(dict2)
            dict3 = {"name": "download", "time": self.time_list["download"]}
            time_list_array.append(dict3)
            dict4 = {"name": "add to cluster", "time": self.time_list["add to cluster"]}
            time_list_array.append(dict4)
            dict5 = {"name": "install network_plugin", "time": self.time_list["install network_plugin"]}
            time_list_array.append(dict5)
            dict6 = {"name": "after_check", "time": self.time_list["after_check"]}
            time_list_array.append(dict6)
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
        task_result['task_stage_counts'] = self.stage_task_list[self.current_stage]
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
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        dict2 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict2)
        dict3 = {"name": "download", "time": self.time_list["download"]}
        time_list_array.append(dict3)
        dict4 = {"name": "add to cluster", "time": self.time_list["add to cluster"]}
        time_list_array.append(dict4)
        dict5 = {"name": "install network_plugin", "time": self.time_list["install network_plugin"]}
        time_list_array.append(dict5)
        dict6 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict6)
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
        task_result['task_stage_counts'] = self.stage_task_list[self.current_stage]
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
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        dict2 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict2)
        dict3 = {"name": "download", "time": self.time_list["download"]}
        time_list_array.append(dict3)
        dict4 = {"name": "add to cluster", "time": self.time_list["add to cluster"]}
        time_list_array.append(dict4)
        dict5 = {"name": "install network_plugin", "time": self.time_list["install network_plugin"]}
        time_list_array.append(dict5)
        dict6 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict6)
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
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        dict2 = {"name": "pre_process", "time": self.time_list["pre_process"]}
        time_list_array.append(dict2)
        dict3 = {"name": "download", "time": self.time_list["download"]}
        time_list_array.append(dict3)
        dict4 = {"name": "add to cluster", "time": self.time_list["add to cluster"]}
        time_list_array.append(dict4)
        dict5 = {"name": "install network_plugin", "time": self.time_list["install network_plugin"]}
        time_list_array.append(dict5)
        dict6 = {"name": "after_check", "time": self.time_list["after_check"]}
        time_list_array.append(dict6)
        print(time_list_array)
        # print(self.time_list)  
