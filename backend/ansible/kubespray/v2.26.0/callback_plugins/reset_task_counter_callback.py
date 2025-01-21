# callback_plugins/task_counter_callback.py
import time
from ansible.plugins.callback import CallbackBase

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    # 必须加入，否则会自动触发
    CALLBACK_NEEDS_ENABLED = True
    CALLBACK_NAME = 'reset_task_counter_callback'

    def __init__(self):
        super().__init__()
        self.task_count = 0  # 初始化任务计数器
        self.time_list = {"reset": 0.0}
        self.task_stage_time = 0.0
        self.current_stage_task = 0
        self.current_stage = 'reset'
        self.start_reset_time = time.time()

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

    def v2_runner_on_ok(self, result):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        self.task_stage_time += elapsed_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 31
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        
        print(task_result)
        # print(f"Task {self.task_count} completed in {elapsed_time:.2f} seconds.")
        
        play_end_time = time.time()
        elapsed_time = play_end_time - self.start_reset_time
        self.time_list[self.current_stage] = elapsed_time
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        print(time_list_array)
            
    def v2_runner_on_failed(self, result, ignore_errors=False):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        self.task_stage_time += elapsed_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 31
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        if not ignore_errors:
            play_end_time = time.time()
            elapsed_time = play_end_time - self.start_reset_time
            self.time_list[self.current_stage] = elapsed_time
            # 在 playbook 完成时输出总任务数
            print("Total tasks executed: {}".format(self.task_count))
            # 将输出数据转换为数组形式
            time_list_array = []
            dict1 = {"name": "reset", "time": self.time_list["reset"]}
            time_list_array.append(dict1)
            print(time_list_array)
        else:
            play_end_time = time.time()
            elapsed_time = play_end_time - self.start_reset_time
            self.time_list[self.current_stage] = elapsed_time
            # 将输出数据转换为数组形式
            time_list_array = []
            dict1 = {"name": "reset", "time": self.time_list["reset"]}
            time_list_array.append(dict1)
            print(time_list_array)
        
        # 当任务失败时，输出当前任务的编号
        # print("Task {} failed: {}".format(self.task_count, result.task_name))
    def v2_runner_on_skipped(self, result):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        self.task_stage_time += elapsed_time
        # 定义一个字典用于输出
        task_result = {}
        # 属于第几个task
        task_result['current_task'] = self.task_count
        # 处于哪个阶段
        task_result['current_stage'] = self.current_stage
        # 当前阶段总task
        task_result['task_stage_counts'] = 31
        # 当前任务耗时
        task_result['current_task_time'] = elapsed_time
        # 当前阶段已经耗时
        task_result['task_stage_time'] = self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        # print("Task {} skipped: {}".format(self.task_count, result.task_name))
        
        play_end_time = time.time()
        elapsed_time = play_end_time - self.start_reset_time
        self.time_list[self.current_stage] = elapsed_time
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        print(time_list_array)
        
    def v2_runner_on_unreachable(self, result):
        # 任务成功完成，记录结束时间
        task_end_time = time.time()
        elapsed_time = task_end_time - self.task_start_time
        self.task_stage_time += elapsed_time
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
        task_result['task_stage_time'] = self.task_stage_time
        # 属于当前所属阶段的第几个task
        task_result['current_stage_task'] = self.current_stage_task
        # 每个task后输出
        print(task_result)
        
        play_end_time = time.time()
        elapsed_time = play_end_time - self.start_reset_time
        self.time_list[self.current_stage] = elapsed_time
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        print(time_list_array)

    def v2_playbook_on_stats(self, stats):
        play_name = self.current_play_name
        play_end_time = time.time()
        elapsed_time = play_end_time - self.start_reset_time
        self.time_list[self.current_stage] = elapsed_time
        # 在 playbook 完成时输出总任务数
        print("Total tasks executed: {}".format(self.task_count))
        # 将输出数据转换为数组形式
        time_list_array = []
        dict1 = {"name": "reset", "time": self.time_list["reset"]}
        time_list_array.append(dict1)
        print(time_list_array)
        # print(self.time_list) 
