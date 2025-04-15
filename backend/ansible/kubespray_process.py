import shutil
import sys
import zipfile
import os
import argparse
import tempfile

def read_yaml_file(file_path):
    """Read the content of a YAML file."""
    with open(file_path, 'r') as file:
        return file.readlines()

def write_yaml_file(file_path, lines):
    """Write lines back to a YAML file."""
    with open(file_path, 'w') as file:
        file.writelines(lines)
    
#     return new_lines
def insert_line_after_pattern(lines, pattern, new_line, nth_line=0):
    """
    Insert a new line after the nth line following the line containing the pattern.

    :param lines: List of lines in the file.
    :param pattern: Pattern to search for.
    :param nth_line: The nth line after the pattern where the new line should be inserted.
    :param new_line: New line to insert.
    :return: Modified list of lines.
    """
    new_lines = []
    found_pattern = False
    count_after_pattern = 0

    for line in lines:
        if found_pattern and count_after_pattern < nth_line:
            count_after_pattern += 1
        
        if pattern in line:
            found_pattern = True
        
        new_lines.append(line)
        
        if found_pattern and count_after_pattern == nth_line:
            new_lines.append(new_line + '\n')
            count_after_pattern += 1  # Increment to avoid inserting again on the next iteration
    
    return new_lines
def replace_line_with_pattern(lines, pattern, new_line):
    """
    Replace the line containing the pattern with a new line.

    :param lines: List of lines in the file.
    :param pattern: Pattern to search for.
    :param new_line: New line to replace the pattern line.
    :return: Modified list of lines.
    """
    new_lines = []

    for line in lines:
        if pattern in line:
            new_lines.append(new_line + '\n')
        else:
            new_lines.append(line)
    
    return new_lines
def unzip_file(zip_path, extract_to='.'):
    """
    Unzips the specified zip file to the given directory.
    
    :param zip_path: Path to the zip file to be extracted.
    :param extract_to: Directory where the contents will be extracted.
    """
    if not os.path.exists(extract_to):
        os.makedirs(extract_to)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print(f"Extracted {zip_path} to {extract_to}")

def remove_lines_after_pattern(lines, pattern, num_lines_to_remove=2):
    """
    Remove the specified number of lines after the line containing the pattern.

    :param lines: List of lines in the file.
    :param pattern: Pattern to search for.
    :param num_lines_to_remove: Number of lines to remove after the pattern.
    :return: Modified list of lines.
    """
    new_lines = []
    skip_count = 0
    found_pattern = False

    for line in lines:
        if found_pattern and skip_count > 0:
            skip_count -= 1
            continue
        
        if pattern in line:
            found_pattern = True
            skip_count = num_lines_to_remove
            new_lines.append(line)
            continue
        
        new_lines.append(line)
    
    return new_lines

def process_files(files, insert_content):
    for file in files:
        if not os.path.isfile(file):
            print(f"File {file} does not exist.")
            continue

        with open(file, 'r') as f:
            content = f.readlines()

        if any(insert_content in line for line in content):
            print(f"The content is already present in {file}.")
            continue

        temp_file = tempfile.NamedTemporaryFile(delete=False, mode='w', newline='')
        
        try:
            first_line = content.pop(0)
            temp_file.write(first_line)
            temp_file.write(f"- name: {insert_content.split(':')[0]}\n")
            temp_file.write(f"  ansible.builtin.import_playbook: {insert_content.split(':')[1]}\n")
            temp_file.writelines(content)
        finally:
            temp_file.close()

        os.replace(temp_file.name, file)
        print(f"Added new content to {file}.")
def main():
    # 解决python_load.sh问题
    FILES1 = ["kubespray/cluster.yml", "kubespray/scale.yml"]
    FILES2 = ["kubespray/cluster.yml", "kubespray/scale.yml"]
    process_files(FILES1, "pre_playbook: ../pre_playbook.yml")
    process_files(FILES2, "force_reset_playbook: ./reset.yml")

    parser = argparse.ArgumentParser(description="Process some parameters.")
    parser.add_argument('--kubespray_version', type=str, default='v2.26.0',
                        help='The kubespray version.')

    args = parser.parse_args()

    # 获取kubespray版本
    kubespray_version = args.kubespray_version[1:]
    print(f"kubespray version: {kubespray_version}")

    # 开始修改kubespray代码部分
    kubespray_path = "./kubespray"
    # 在kubespray_path下创建callback_plugins目录
    os.makedirs(f"{kubespray_path}/callback_plugins", exist_ok=True)
    # 复制callback_plugins目录下的文件到kubespray_path下
    for file in os.listdir("./callback_plugins"):
        if file.endswith(".py"):
            shutil.copy(f"./callback_plugins/{file}", f"{kubespray_path}/callback_plugins/{file}")

    # 修改roles/download/tasks/download_file.yml，目的是修改下载相关代码，主要是2.23版本部分
    # 读入该yml文件
    lines = read_yaml_file(f"{kubespray_path}/roles/download/tasks/download_file.yml")
    # 在  - name: Download_file | Validate mirrors新增when: false
    modified_lines = insert_line_after_pattern(lines, "- name: Download_file | Validate mirrors", "    when: false")
    # 在  - name: Download_file | Get the list of working mirrors新增when: false
    modified_lines = insert_line_after_pattern(modified_lines, "- name: Download_file | Get the list of working mirrors", "    when: false")
    # 在  - name: Download_file | Download item新增when: false
    modified_lines = insert_line_after_pattern(modified_lines, "- name: Download_file | Download item", "    when: false")
    # 将传输方式从rsync修改为copy
    # modified_lines = replace_line_with_pattern(modified_lines, "    ansible.posix.synchronize:", "    ansible.builtin.copy:")
    # 注释掉copy模块没有的参数
    # modified_lines = replace_line_with_pattern(modified_lines, "use_ssh_args: true", "#use_ssh_args: true")
    # modified_lines = replace_line_with_pattern(modified_lines, "mode: push", "#mode: push")
    new_string = """      rsync_opts:
        - "--no-perms"
        - "--no-owner"    
        - "--no-group"
        - "--copy-links" """
    modified_lines = insert_line_after_pattern(modified_lines, "mode: push", new_string)    
    # 将文件夹权限修改为777
    modified_lines = replace_line_with_pattern(modified_lines, "      mode: \"0755\"", "      mode: \"0777\"")
    modified_lines = replace_line_with_pattern(modified_lines, "      mode: 0755", "      mode: 0777")
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/download/tasks/download_file.yml", modified_lines)

    # 修改roles/download/tasks/download_container.yml，修改传输模块
    # 读入该yml文件
    lines = read_yaml_file(f"{kubespray_path}/roles/download/tasks/download_container.yml")
    # 将传输方式从rsync修改为copy
    # modified_lines = replace_line_with_pattern(modified_lines, "    ansible.posix.synchronize:", "    ansible.builtin.copy:")
    # # 注释掉copy模块没有的参数
    # modified_lines = replace_line_with_pattern(modified_lines, "use_ssh_args: true", "#use_ssh_args: true")
    # modified_lines = replace_line_with_pattern(modified_lines, "mode: push", "#mode: push")
    # 注释掉failed when 
    modified_lines = replace_line_with_pattern(lines, "      failed_when: not upload_image", "      #failed_when: not upload_image")

    new_string = """        rsync_opts:
          - "--copy-links" """
    modified_lines = insert_line_after_pattern(modified_lines, "mode: push", new_string)    
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/download/tasks/download_container.yml", modified_lines)

    # # 修改roles\kubernetes\preinstall\tasks\0020-set_facts.yml来禁用nameserver检查
    # # 读入该yml文件
    # lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes/preinstall/tasks/0020-set_facts.yml")
    # # 在    - not (upstream_dns_servers is defined and upstream_dns_servers | length > 0)新增- false
    # modified_lines = insert_line_after_pattern(lines, "    - not (upstream_dns_servers is defined and upstream_dns_servers | length > 0)", "    - false")
    # # 将更改写入文件
    # write_yaml_file(f"{kubespray_path}/roles/kubernetes/preinstall/tasks/0020-set_facts.yml", modified_lines)

    # # 修改/roles/kubernetes-apps/network_plugin/meta/main.yml中multus相关配置   
    # # 读入该yml文件
    # lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes-apps/network_plugin/meta/main.yml")
    # # 将    when: kube_network_plugin_multus替换为 false
    # modified_lines = replace_line_with_pattern(lines, "    when: kube_network_plugin_multus", "    when: false")
    # # 将更改写入文件
    # write_yaml_file(f"{kubespray_path}/roles/kubernetes-apps/network_plugin/meta/main.yml", modified_lines)
    #修改roles/download/defaults/main/main.yml
    lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes-apps/network_plugin/meta/main.yml")
    # 删除sha256: "{{ metrics_server_digest_checksum | default(None) }}"的后面两行内容
    modified_lines = remove_lines_after_pattern(lines, "      - kube-router", 5)
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/kubernetes-apps/network_plugin/meta/main.yml", modified_lines)

    # 修改/roles/network_plugin/meta/main.yml中multus相关配置
    # 读入该文件
    lines = read_yaml_file(f"{kubespray_path}/roles/network_plugin/meta/main.yml")
    # 将    when: kube_network_plugin_multus中新增- false
    modified_lines = replace_line_with_pattern(lines, "    when: kube_network_plugin_multus", "    when: false")
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/network_plugin/meta/main.yml", modified_lines)

    # 修改roles/kubernetes-apps/network_plugin/multus/tasks/main.yml
    # 读入该文件
    lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes-apps/network_plugin/multus/tasks/main.yml")
    # 将    when: kube_network_plugin_multus中新增- false
    modified_lines = replace_line_with_pattern(lines, "    - not item is skipped", "    - false")
    modified_lines = insert_line_after_pattern(lines, "  run_once: true", "  ignore_errors: true")
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/kubernetes-apps/network_plugin/multus/tasks/main.yml", modified_lines)

    # 根据kubespray的版本来修复metrics_server的镜像拉取问题
    if kubespray_version == "2.23.3":
        # 修改roles/download/defaults/main/main.yml
        lines = read_yaml_file(f"{kubespray_path}/roles/download/defaults/main/main.yml")
        # 删除sha256: "{{ metrics_server_digest_checksum | default(None) }}"的后面两行内容
        modified_lines = remove_lines_after_pattern(lines, "sha256: \"{{ metrics_server_digest_checksum | default(None) }}\"")
        # 在sha256: "{{ metrics_server_digest_checksum | default(None) }}"后新增    groups:和    - k8s_cluster
        modified_lines = insert_line_after_pattern(modified_lines, "sha256: \"{{ metrics_server_digest_checksum | default(None) }}\"", "    groups:\n    - k8s_cluster")
        # 将更改写入文件
        write_yaml_file(f"{kubespray_path}/roles/download/defaults/main/main.yml", modified_lines)
    elif kubespray_version == "2.26.0":
        # 修改roles/kubespray-defaults/defaults/main/download.yml
        lines = read_yaml_file(f"{kubespray_path}/roles/kubespray-defaults/defaults/main/download.yml")
        # 删除sha256: "{{ metrics_server_digest_checksum | default(None) }}"的后面两行内容
        modified_lines = remove_lines_after_pattern(lines, "sha256: \"{{ metrics_server_digest_checksum | default(None) }}\"")
        # 在sha256: "{{ metrics_server_digest_checksum | default(None) }}"后新增    groups:和    - k8s_cluster
        modified_lines = insert_line_after_pattern(modified_lines, "sha256: \"{{ metrics_server_digest_checksum | default(None) }}\"", "    groups:\n    - k8s_cluster")
        # 将更改写入文件
        write_yaml_file(f"{kubespray_path}/roles/kubespray-defaults/defaults/main/download.yml", modified_lines)

    # 在kubespray中新增代码实现高并发部署集群
    # 修改playbooks/scale.yml文件，新增node等待master与certificate_key获取
    lines = read_yaml_file(f"{kubespray_path}/playbooks/scale.yml")
    # 定义需要新增的字符串
    new_string = "- name: Upload control plane certs and retrieve encryption key(new)\n\
  hosts: kube_node\n\
  environment: \"{{ proxy_disable_env }}\"\n\
  gather_facts: false\n\
  tags: kubeadm\n\
  roles:\n\
    - { role: kubespray-defaults }\n\
  tasks:\n\
    - name: Wait for master node to be ready\n\
      shell: |\n\
        {{ kubectl }}  get nodes\n\
      args:\n\
        executable: /bin/bash\n\
      register: wait_for_master\n\
      until: wait_for_master.rc == 0\n\
      retries: 180\n\
      delay: 5\n\
      failed_when: false\n\
      changed_when: false\n\
      delegate_to: \"{{ groups['kube_control_plane'][0] }}\"\n\
    - name: Upload control plane certificates\n\
      command: >-\n\
        {{ bin_dir }}/kubeadm init phase\n\
        --config {{ kube_config_dir }}/kubeadm-config.yaml\n\
        upload-certs\n\
        --upload-certs\n\
      environment: \"{{ proxy_disable_env }}\"\n\
      delegate_to: \"{{ groups['kube_control_plane'][0] }}\"\n\
      register: kubeadm_upload_cert\n\
      changed_when: false\n\
    - name: Set fact 'kubeadm_certificate_key' for later use\n\
      set_fact:\n\
        kubeadm_certificate_key: \"{{ kubeadm_upload_cert.stdout_lines[-1] | trim }}\""
    modified_lines = insert_line_after_pattern(lines, "when: kubeadm_certificate_key is not defined", new_string)
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/playbooks/scale.yml", modified_lines)
    
    # 修改roles/kubernetes/control-plane/tasks/main.yml文件，新增其他master等待master1
    lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes/control-plane/tasks/main.yml")
    # 定义需要新增的字符串
    new_string = "- name: Wait for master node to be ready\n\
  shell: |\n\
    {{ kubectl }}  get nodes\n\
  args:\n\
    executable: /bin/bash\n\
  register: wait_for_master\n\
  until: wait_for_master.rc == 0\n\
  retries: 180\n\
  delay: 5\n\
  failed_when: false\n\
  changed_when: false\n\
  delegate_to: \"{{ groups['kube_control_plane'][0] }}\"\n\
  when: inventory_hostname != groups['kube_control_plane'][0]"
    modified_lines = insert_line_after_pattern(lines, "---", new_string)
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/kubernetes/control-plane/tasks/main.yml", modified_lines)

    # 解决高并发导致的delegate重复运行问题
    # 修改roles/kubernetes/kubeadm/tasks/main.yml中的when判断
    lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes/kubeadm/tasks/main.yml")
    # - name: Update server field in kube-proxy kubeconfig后面10行新增
    modified_lines = insert_line_after_pattern(lines, "- name: Update server field in kube-proxy kubeconfig", "    - inventory_hostname == groups['kube_control_plane'][0]", 10)
    # - name: Restart all kube-proxy pods to ensure that they load the new configmap后面
    modified_lines = insert_line_after_pattern(modified_lines, "- name: Restart all kube-proxy pods to ensure that they load the new configmap", "    - inventory_hostname == groups['kube_control_plane'][0]", 5)
    # - name: Get current resourceVersion of kube-proxy configmap后面10行新增
    modified_lines = insert_line_after_pattern(modified_lines, "- name: Get current resourceVersion of kube-proxy configmap", "    - inventory_hostname == groups['kube_control_plane'][0]", 6)
    # - name: Get new resourceVersion of kube-proxy configmap后面
    modified_lines = insert_line_after_pattern(modified_lines, "- name: Get new resourceVersion of kube-proxy configmap", "    - inventory_hostname == groups['kube_control_plane'][0]", 6)
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/kubernetes/kubeadm/tasks/main.yml", modified_lines)

    # 修改roles/kubernetes/preinstall/vars/main.yml解决CentOS操作系统依赖问题
    if kubespray_version == "2.26.0":
      lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes/preinstall/vars/main.yml")
      # 删除CentOS: {}行
      modified_lines = replace_line_with_pattern(lines, "CentOS: {}", "#CentOS: {}")
      modified_lines = insert_line_after_pattern(modified_lines, "libselinux-python", "        CentOS: {}", 2)
      # 将更改写入文件
      write_yaml_file(f"{kubespray_path}/roles/kubernetes/preinstall/vars/main.yml", modified_lines)

    # 拷贝group_vars目录，解决变量传递问题
    if kubespray_version == "2.23.3":
        shutil.copytree(f"{kubespray_path}/inventory/sample/group_vars/all", f"{kubespray_path}/roles/kubespray-defaults/defaults/main/all")
        shutil.copytree(f"{kubespray_path}/inventory/sample/group_vars/k8s_cluster", f"{kubespray_path}/roles/kubespray-defaults/defaults/main/k8s_cluster")
        shutil.move(f"{kubespray_path}/roles/kubespray-defaults/defaults/main.yaml", f"{kubespray_path}/roles/kubespray-defaults/defaults/main/main.yaml")
        # 解决calico版本问题
        lines = read_yaml_file(f"{kubespray_path}/roles/network_plugin/calico/tasks/check.yml")
        # - name: Stop if supported Calico versions后插入
        modified_lines = insert_line_after_pattern(lines, "- name: Stop if supported Calico versions","  when: false")
        # 更改写入文件
        write_yaml_file(f"{kubespray_path}/roles/network_plugin/calico/tasks/check.yml", modified_lines)  
    elif kubespray_version == "2.26.0":
        shutil.copytree(f"{kubespray_path}/inventory/sample/group_vars/all", f"{kubespray_path}/roles/kubespray-defaults/defaults/main/all")
        shutil.copytree(f"{kubespray_path}/inventory/sample/group_vars/k8s_cluster", f"{kubespray_path}/roles/kubespray-defaults/defaults/main/k8s_cluster")

    # 修改playbooks/cluster.yml，新增重启nginx
    lines = read_yaml_file(f"{kubespray_path}/playbooks/cluster.yml")
    # - { role: kubernetes/preinstall, when: "dns_mode != 'none' and resolvconf_mode == 'host_resolvconf'", tags: resolvconf, dns_late: true }后新增
    new_string = """- name: Restart nginx-proxy containers
  hosts: kube_control_plane 
  roles:
    - { role: kubespray-defaults }
  tasks:
    - name: Nginx-proxy | Make nginx directory
      file:
        path: "{{ nginx_config_dir }}"
        state: directory
        mode: "0700"
        owner: root
      loop: "{{ groups['kube_node'] }}"
      delegate_to: "{{ item }}"

    - name: Nginx-proxy | Write nginx-proxy configuration
      template:
        src: "../roles/kubernetes/node/templates/loadbalancer/nginx.conf.j2"
        dest: "{{ nginx_config_dir }}/nginx.conf"
        owner: root
        mode: "0755"
        backup: true
      loop: "{{ groups['kube_node'] }}"
      delegate_to: "{{ item }}"

    - name: Restart nginx-proxy containers
      shell: "{{bin_dir}}/crictl ps | grep nginx-proxy | awk '{print $1}' | xargs {{bin_dir}}/crictl stop"
      loop: "{{ groups['kube_node'] }}"
      delegate_to: "{{ item }}"
      ignore_errors: yes

    - name: Restart first flannel containers
      shell: "{{bin_dir}}/crictl ps | grep kube-flannel | awk '{print $1}' | xargs {{bin_dir}}/crictl stop"
      delegate_to: "{{ groups['kube_control_plane'] | first }}"
      ignore_errors: yes
    """
    modified_lines = insert_line_after_pattern(lines, """- { role: kubernetes/preinstall, when: "dns_mode != 'none' and resolvconf_mode == 'host_resolvconf'", tags: resolvconf, dns_late: true }""", new_string)
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/playbooks/cluster.yml", modified_lines)

    # 修改roles/kubernetes/control-plane/tasks/kubeadm-secondary.yml，解决证书问题
    lines = read_yaml_file(f"{kubespray_path}/roles/kubernetes/control-plane/tasks/kubeadm-secondary.yml")
    # 注释条件判断
    modified_lines = replace_line_with_pattern(lines, "- inventory_hostname == first_kube_control_plane", "# - inventory_hostname == first_kube_control_plane")
    # 插入delegate_to
    modified_lines = insert_line_after_pattern(modified_lines, "register: kubeadm_upload_cert", """  delegate_to: "{{ first_kube_control_plane }}" """)
    # 将更改写入文件
    write_yaml_file(f"{kubespray_path}/roles/kubernetes/control-plane/tasks/kubeadm-secondary.yml", modified_lines)

    # 移动reset.yml文件并覆盖
    os.remove("./kubespray/playbooks/reset.yml")
    shutil.copy2("reset.yml", "./kubespray/playbooks")
    

if __name__ == "__main__":
    main()



