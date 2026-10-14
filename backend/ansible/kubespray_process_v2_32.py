from pathlib import Path
import shutil


def replace_once(content, old, new, name):
    count = content.count(old)
    if count != 1:
        raise ValueError(f"{name}: expected one match, found {count}: {old}")
    return content.replace(old, new, 1)


def update_file(path, changes):
    content = path.read_text(encoding="utf-8")
    for old, new in changes:
        content = replace_once(content, old, new, str(path))
    path.write_text(content, encoding="utf-8")


def repair_module_links(root):
    """Materialize module links flattened by ZIP extraction on Windows."""
    repaired = []
    root = root.resolve()
    for directory in (root / "library", root / "plugins"):
        for path in directory.rglob("*.py"):
            if path.is_symlink() or path.stat().st_size > 1024:
                continue
            relative = path.read_text(encoding="utf-8").strip()
            if not relative.startswith(("../", "./")) or "\n" in relative:
                continue
            target = (path.parent / relative).resolve()
            if not target.is_relative_to(root) or not target.is_file():
                raise ValueError(f"Invalid module link: {path} -> {relative}")
            content = target.read_bytes()
            if not content.startswith(b"#!"):
                raise ValueError(f"Module target has no interpreter line: {target}")
            path.write_bytes(content)
            repaired.append(str(path.relative_to(root)))
    return repaired


def prepare_worker_join(root):
    """Wait on the first control plane before workers request join tokens."""
    path = root / "roles/kubernetes/kubeadm/tasks/main.yml"
    content = path.read_text(encoding="utf-8")
    marker = "- name: Kubeaver | Wait for control plane before joining workers\n"
    if marker in content:
        return
    wait = (
        marker
        + "  ansible.builtin.command:\n"
        "    argv:\n"
        "      - '{{ bin_dir }}/kubectl'\n"
        "      - '--kubeconfig={{ kube_config_dir }}/admin.conf'\n"
        "      - get\n"
        "      - nodes\n"
        "  register: kubeaver_control_plane_ready\n"
        "  until: kubeaver_control_plane_ready.rc == 0\n"
        "  retries: 180\n"
        "  delay: 5\n"
        "  changed_when: false\n"
        "  delegate_to: '{{ groups[\"kube_control_plane\"][0] }}'\n"
        "  run_once: true\n\n"
    )
    content = replace_once(
        content,
        "- name: Check if kubeadm CA cert is accessible\n",
        wait + "- name: Check if kubeadm CA cert is accessible\n",
        str(path),
    )
    # 工作节点任务使用--limit运行，会跳过独立的控制平面剧本
    # 从生成的InitConfiguration中读取密钥，供并发上传证书使用
    certificates = """- name: Kubeaver | Upload control plane certificates for workers
  ansible.builtin.shell: |
    set -euo pipefail
    exec 9>{{ kube_config_dir }}/.kubeaver-upload-certs.lock
    flock -x 9
    # kubeadm不允许同时使用--certificate-key和--config
    # 从生成的InitConfiguration中读取密钥，保证证书上传和工作节点下载使用相同密钥
    key=$(awk '/^certificateKey:/ {gsub(/[\"\\047]/, "", $2); print $2; exit}' {{ kube_config_dir }}/kubeadm-config.yaml)
    [[ "$key" =~ ^[a-f0-9]{64}$ ]]
    {{ bin_dir }}/kubeadm init phase upload-certs --config={{ kube_config_dir }}/kubeadm-config.yaml --upload-certs --skip-certificate-key-print
    printf '%s\\n' "$key"
  args:
    executable: /bin/bash
  delegate_to: '{{ groups["kube_control_plane"][0] }}'
  register: kubeaver_uploaded_certs
  changed_when: false
  no_log: true
  when:
    - etcd_deployment_type == 'kubeadm'
    - inventory_hostname not in groups['kube_control_plane']

- name: Kubeaver | Set worker certificate key
  ansible.builtin.set_fact:
    kubeadm_certificate_key: '{{ kubeaver_uploaded_certs.stdout_lines[-1] | trim }}'
  no_log: true
  when:
    - etcd_deployment_type == 'kubeadm'
    - inventory_hostname not in groups['kube_control_plane']

"""
    content = replace_once(
        content,
        "- name: Extract etcd certs from control plane if using etcd kubeadm mode\n",
        certificates + "- name: Extract etcd certs from control plane if using etcd kubeadm mode\n",
        str(path),
    )
    content = replace_once(
        content,
        '  command: "{{ bin_dir }}/kubeadm token create --config={{ kube_config_dir }}/kubeadm-config.yaml"',
        '  command: "{{ bin_dir }}/kubeadm token create --kubeconfig={{ kube_config_dir }}/admin.conf --config={{ kube_config_dir }}/kubeadm-config.yaml"',
        str(path),
    )
    path.write_text(content, encoding="utf-8")


def prepare_kube_proxy(root):
    """Preserve Kubeaver's first-control-plane guard for shared kube-proxy tasks."""
    path = root / "roles/kubernetes/kubeadm/tasks/main.yml"
    content = path.read_text(encoding="utf-8")
    condition = "    - inventory_hostname == groups['kube_control_plane'][0]\n"
    for name in (
        "Get current resourceVersion of kube-proxy configmap",
        "Update server field in kube-proxy kubeconfig",
        "Update server field in kube-proxy kubeconfig - external lb",
        "Get new resourceVersion of kube-proxy configmap",
        "Restart all kube-proxy pods to ensure that they load the new configmap",
    ):
        marker = f"- name: {name}\n"
        start = content.index(marker)
        end = content.find("\n- name:", start + len(marker))
        task = content[start:end if end != -1 else len(content)]
        if condition not in task:
            guarded = replace_once(task, "  when:\n", "  when:\n" + condition, str(path))
            content = replace_once(content, task, guarded, str(path))
    path.write_text(content, encoding="utf-8")


def prepare_playbooks(root):
    # 调整预处理和重置剧本，适配Ansible 2.19的条件判断
    pre_playbook = Path("pre_playbook.yml").read_text(encoding="utf-8")
    for os_name in ("openEuler", "Rocky", "Ubuntu", "CentOS"):
        old = "{{ os_pretty_name | regex_search('" + os_name + "', ignorecase=True) }}"
        new = "{{ (os_pretty_name | regex_search('" + os_name + "', ignorecase=True)) is not none }}"
        pre_playbook = replace_once(pre_playbook, old, new, "pre_playbook.yml")
    pre_playbook = replace_once(
        pre_playbook,
        "      when: \n        - repo_files.matched > 0\n      when: not is_ubuntu",
        "      when: not is_ubuntu and repo_files.matched > 0",
        "pre_playbook.yml",
    )
    pre_playbook = replace_once(
        pre_playbook,
        "        is_centos: \"{{ (os_pretty_name | regex_search('CentOS', ignorecase=True)) is not none }}\"\n",
        "        is_centos: \"{{ (os_pretty_name | regex_search('CentOS', ignorecase=True)) is not none }}\"\n"
        "\n    - name: Check supported operating system\n"
        "      ansible.builtin.assert:\n"
        "        that:\n"
        "          - \"(is_ubuntu and os_pretty_name is search('^Ubuntu_22[.]04([._]|$)')) or (is_rocky and os_pretty_name is search('^Rocky_9([._]|$)'))\"\n"
        "        fail_msg: 'Kubernetes 1.34-1.36 packages require Ubuntu 22.04 or Rocky 9'\n",
        "pre_playbook.yml",
    )
    Path("pre_playbook-v2.32.0.yml").write_text(pre_playbook, encoding="utf-8")

    reset = Path("reset.yml").read_text(encoding="utf-8")
    reset = replace_once(reset, "role: kubespray-defaults", "role: kubespray_defaults", "reset.yml")
    for os_name in ("openEuler", "Rocky", "Ubuntu", "CentOS"):
        old = "{{ os_name_output.stdout | regex_search('" + os_name + "', ignorecase=True) }}"
        new = "{{ (os_name_output.stdout | regex_search('" + os_name + "', ignorecase=True)) is not none }}"
        reset = replace_once(reset, old, new, "reset.yml")
    # Ansible 2.19不允许将注册结果字典直接用于条件判断
    # 仅在发现挂载目录时执行卸载
    reset = replace_once(
        reset,
        "      when: mounted_dirs\n",
        "      when: (mounted_dirs.stdout_lines | default([])) | length > 0\n",
        "reset.yml",
    )
    (root / "playbooks/reset.yml").write_text(reset, encoding="utf-8")

    imports = (
        "- name: force_reset_playbook\n"
        "  ansible.builtin.import_playbook: ./reset.yml\n"
        "- name: pre_playbook\n"
        "  ansible.builtin.import_playbook: ../pre_playbook-v2.32.0.yml\n"
    )
    for playbook in (root / "cluster.yml", root / "scale.yml"):
        update_file(playbook, [("---\n", "---\n" + imports)])


def prepare_control_plane_certificates(root):
    path = root / "roles/kubernetes/control-plane/tasks/main.yml"
    content = path.read_text(encoding="utf-8")
    marker = "- name: Kubeaver | Prepare shared certificate key\n"
    if marker in content:
        return
    prepare = """- name: Kubeaver | Prepare shared certificate key
  ansible.builtin.shell: |
    set -euo pipefail
    mkdir -p {{ kube_config_dir }}
    exec 9>{{ kube_config_dir }}/.kubeaver-upload-certs.lock
    flock -x 9
    key_file={{ kube_config_dir }}/.kubeaver-certificate-key
    if [ ! -s "$key_file" ]; then
      umask 077
      {{ bin_dir }}/kubeadm certs certificate-key > "$key_file"
    fi
    key=$(cat "$key_file")
    [[ "$key" =~ ^[a-f0-9]{64}$ ]]
    printf '%s\\n' "$key"
  args:
    executable: /bin/bash
  delegate_to: '{{ groups["kube_control_plane"][0] }}'
  register: kubeaver_shared_certificate_key
  changed_when: false
  no_log: true

- name: Kubeaver | Set control plane certificate key
  ansible.builtin.set_fact:
    kubeadm_certificate_key: '{{ kubeaver_shared_certificate_key.stdout_lines[-1] | trim }}'
  no_log: true

"""
    content = replace_once(content, "- name: Include kubeadm setup\n", prepare + "- name: Include kubeadm setup\n", str(path))
    path.write_text(content, encoding="utf-8")


def prepare_fact_cache_check(root):
    # Kubeaver为每个节点单独运行--limit进程
    update_file(
        root / "roles/kubernetes/preinstall/tasks/0040-verify-settings.yml",
        [("    - ansible_limit is defined\n", "    - false\n")],
    )


def prepare_control_plane_wait(root):
    wait = """- name: Kubeaver | Wait for first control plane before joining control planes
  ansible.builtin.command:
    argv:
      - '{{ bin_dir }}/kubectl'
      - '--kubeconfig={{ kube_config_dir }}/admin.conf'
      - get
      - nodes
  register: kubeaver_first_control_plane_ready
  until: kubeaver_first_control_plane_ready.rc == 0
  retries: 180
  delay: 5
  changed_when: false
  delegate_to: '{{ groups["kube_control_plane"][0] }}'
  when: inventory_hostname != groups['kube_control_plane'][0]

"""
    update_file(root / "roles/kubernetes/control-plane/tasks/main.yml", [("---\n", "---\n" + wait)])


def prepare_control_plane_upgrade(root):
    # 仅在控制平面升级时暂存kubelet，不影响新集群安装
    play = "- name: Handle upgrades to control plane components first to maintain backwards compat.\n"
    update_file(
        root / "playbooks/upgrade_cluster.yml",
        [(play, play + "  vars:\n    kubeaver_control_plane_upgrade: true\n")],
    )
    stage = """
- name: Kubeaver | Stage control plane kubelet for upgrade
  copy:
    src: "{{ downloads.kubelet.dest }}"
    dest: /tmp/kubelet
    mode: "0755"
    remote_src: true
  when:
    - kubeaver_control_plane_upgrade | default(false)
    - inventory_hostname in groups['kube_control_plane']
  tags:
    - kubelet
    - upgrade
"""
    path = root / "roles/kubernetes/node/tasks/install.yml"
    content = path.read_text(encoding="utf-8")
    content = replace_once(
        content,
        "  notify: Node | restart kubelet\n",
        "  notify: Node | restart kubelet\n"
        "  when: not ((kubeaver_control_plane_upgrade | default(false)) and inventory_hostname in groups['kube_control_plane'])\n",
        str(path),
    )
    path.write_text(content + stage, encoding="utf-8")
    finish = """- name: Kubeaver | Finish control plane kubelet upgrade
  when:
    - kubeaver_control_plane_upgrade | default(false)
    - inventory_hostname in groups['kube_control_plane']
  block:
    - name: Install staged control plane kubelet
      copy:
        src: /tmp/kubelet
        dest: "{{ bin_dir }}/kubelet"
        mode: "0755"
        remote_src: true

    - name: Reload kubelet systemd configuration
      systemd_service:
        daemon_reload: true

    - name: Restart upgraded control plane kubelet
      service:
        name: kubelet
        state: restarted

    - name: Wait for apiserver after kubelet upgrade
      uri:
        url: "{{ kube_apiserver_endpoint }}/healthz"
        validate_certs: false
      register: kubeaver_apiserver_health
      until: kubeaver_apiserver_health.status == 200
      retries: "{{ control_plane_health_retries }}"
      delay: 1

"""
    update_file(root / "roles/upgrade/post-upgrade/tasks/main.yml", [("---\n", "---\n" + finish)])
    update_file(
        root / "roles/network_plugin/flannel/tasks/main.yml",
        [(
            "- name: Flannel | Start Resources\n",
            "- name: Flannel | Start Resources\n"
            "  register: flannel_apply_result\n"
            "  until: flannel_apply_result is succeeded\n"
            "  retries: 6\n"
            "  delay: 5\n",
        )],
    )


def prepare_nginx_refresh(root):
    # 新增控制平面时，--limit不会包含已有工作节点
    refresh = """
- name: Kubeaver | Refresh existing node nginx proxies
  hosts: kube_control_plane
  gather_facts: false
  roles:
    - { role: kubespray_defaults }
  tasks:
    - name: Refresh nginx proxies after control plane deployment
      run_once: true
      when:
        - loadbalancer_apiserver_localhost
        - loadbalancer_apiserver_type == 'nginx'
      block:
        - name: Check for existing nginx configuration
          stat:
            path: "{{ nginx_config_dir }}/nginx.conf"
          loop: "{{ groups['kube_node'] }}"
          delegate_to: "{{ item }}"
          register: kubeaver_nginx_files

        - name: Refresh existing nginx upstreams
          template:
            src: "../roles/kubernetes/node/templates/loadbalancer/nginx.conf.j2"
            dest: "{{ nginx_config_dir }}/nginx.conf"
            owner: root
            mode: "0755"
            backup: true
          loop: "{{ kubeaver_nginx_files.results }}"
          loop_control:
            label: "{{ item.item }}"
          delegate_to: "{{ item.item }}"
          when: item.stat.exists
          register: kubeaver_nginx_updates

        - name: Restart nginx proxies with changed upstreams
          shell: "{{ bin_dir }}/crictl ps --name '^nginx-proxy$' -q | xargs --no-run-if-empty {{ bin_dir }}/crictl stop"
          loop: "{{ kubeaver_nginx_updates.results }}"
          loop_control:
            label: "{{ item.item.item }}"
          delegate_to: "{{ item.item.item }}"
          when: item.changed | default(false)
          ignore_errors: true
"""
    path = root / "playbooks/cluster.yml"
    path.write_text(path.read_text(encoding="utf-8") + refresh, encoding="utf-8")


def prepare_addon_images(root):
    # 将metrics-server和dnsautoscaler镜像下载范围改为整个集群
    path = root / "roles/kubespray_defaults/defaults/main/download.yml"
    changes = []
    for component in ("metrics_server", "dnsautoscaler"):
        checksum = f'    checksum: "{{{{ {component}_digest_checksum | default(None) }}}}"\n'
        changes.append((
            checksum + "    groups:\n      - kube_control_plane\n",
            checksum + "    groups:\n      - k8s_cluster\n",
        ))
    update_file(path, changes)


def prepare_certificate_sans(root):
    path = root / "roles/kubernetes/control-plane/tasks/kubeadm-setup.yml"
    changes = [(
        '      - "{{ supplementary_addresses_in_ssl_keys }}"\n',
        '      - "{{ supplementary_addresses_in_ssl_keys }}"\n'
        '      - "{{ groups[\'kube_control_plane\'] }}"\n',
    )]
    # 过滤未定义的节点信息，避免Ansible 2.19执行map/extract时报错
    for field in ("main_access_ip", "main_ip", "ansible_hostname", "ansible_fqdn"):
        changes.append((
            f"groups['kube_control_plane'] | map('extract', hostvars, '{field}')",
            "groups['kube_control_plane'] | map('extract', hostvars) "
            f"| selectattr('{field}', 'defined') | map(attribute='{field}')",
        ))
    for field in ("ansible_default_ipv4", "ansible_default_ipv6"):
        changes.append((
            f"groups['kube_control_plane'] | map('extract', hostvars, ['{field}', 'address']) | select('defined')",
            "groups['kube_control_plane'] | map('extract', hostvars) "
            f"| selectattr('{field}', 'defined') | map(attribute='{field}') "
            "| selectattr('address', 'defined') | map(attribute='address')",
        ))
    update_file(path, changes)


def prepare_downloads(root):
    # 关闭在线文件下载，调整离线文件和镜像同步参数
    update_file(
        root / "roles/download/tasks/download_file.yml",
        [
            (
                "  - name: Download_file | Download item\n    get_url:",
                "  - name: Download_file | Download item\n    when: false\n    get_url:",
            ),
            (
                "      mode: push\n    register: get_task",
                "      mode: push\n      rsync_opts:\n        - --no-perms\n        - --no-owner\n        - --no-group\n        - --copy-links\n    register: get_task",
            ),
        ],
    )
    update_file(
        root / "roles/download/tasks/download_container.yml",
        [
            (
                "        mode: push\n      delegate_facts: false",
                "        mode: push\n        rsync_opts:\n          - --copy-links\n      delegate_facts: false",
            ),
            ("      failed_when: not upload_image\n", ""),
        ],
    )


def process():
    root = Path("kubespray")
    if not (root / "roles/kubespray_defaults/defaults/main/download.yml").is_file():
        raise FileNotFoundError("Kubespray v2.32.0 source was not found")

    callbacks = root / "callback_plugins"
    callbacks.mkdir(exist_ok=True)
    for callback in Path("callback_plugins").glob("*.py"):
        shutil.copy2(callback, callbacks / callback.name)

    repair_module_links(root)
    prepare_playbooks(root)
    prepare_worker_join(root)
    prepare_kube_proxy(root)
    prepare_control_plane_certificates(root)
    prepare_downloads(root)
    prepare_fact_cache_check(root)
    prepare_control_plane_wait(root)
    prepare_control_plane_upgrade(root)
    prepare_nginx_refresh(root)
    prepare_addon_images(root)
    prepare_certificate_sans(root)
