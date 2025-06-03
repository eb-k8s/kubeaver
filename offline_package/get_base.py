import yaml
import argparse
from jinja2 import Template
import os
import subprocess

# 使用 Jinja2 渲染 YAML 文件中的单个变量
def render_template(yaml_content, kube_version, image_arch):
    # 将 YAML 文件内容转换为字符串
    yaml_str = yaml.dump(yaml_content)
    
    # 使用 Jinja2 渲染字符串，传递单个变量
    template = Template(yaml_str)
    rendered_content = template.render(kube_version=kube_version, image_arch=image_arch)
    
    # 将渲染后的字符串重新转换为 Python 对象
    return yaml.safe_load(rendered_content)

# 设置全局参数
# 具体的k8s版本与yaml文件前缀
store_k8s_yaml_prefix ='./yml/store_k8s'
# 每个文件和镜像从何处下载
store_file_url_filename = './yml/url_and_repo.yml'

# 创建解析器解析命令行参数
parser = argparse.ArgumentParser(description='读取用户指定的离线包信息')
# 添加 k8s_version 参数，设置默认值
parser.add_argument('--k8s_version', type=str, default='v1.28.12', help='Kubernetes 版本')
# 添加 image_arch 参数，设置默认值
parser.add_argument('--image_arch', type=str, default='amd64', help='文件系统架构')
# parser.add_argument('--support_os', type=str, default='openEuler 22.03 (LTS-SP4)', help='支持的操作系统版本')
# 添加 image_registry 参数，设置默认值
parser.add_argument('--image_registry', type=str, default='store.e-byte.cn', help='离线服务器镜像域名')
# 添加 target_path 参数，设置默认值
parser.add_argument('--target_path', type=str, default='./', help='离线包生成路径')
# 解析参数
args = parser.parse_args() 

# 根据用户输入的参数确定要读入的yaml文件
# 取得读入的k8s版本
k8s_version = args.k8s_version
store_offline_path = args.target_path
image_arch = args.image_arch
# 只需要其次要版本
version_prefix = '.'.join(k8s_version[1:].split('.')[:2])  # 例如 v1.28.10 -> v1.28
# 根据k8s版本读取对应的yaml文件
k8s_yaml_filename = f'{store_k8s_yaml_prefix }_{version_prefix}.yml'
# 读入k8s版本依赖的yaml文件
with open(k8s_yaml_filename, 'r', encoding='utf-8') as file:
    raw_k8s_yaml = yaml.safe_load(file)
# 将读入的yaml中的kube_version改成用户输入的版本
k8s_yaml = render_template(raw_k8s_yaml, args.k8s_version, args.image_arch)

# 读取文件链接文件，用于指定从哪里下载文件
with open(store_file_url_filename, 'r', encoding='utf-8') as file:
    download_url_yaml = yaml.safe_load(file)


# 创建离线包文件夹
# offline_dir = f"{store_offline_path}/spray-{k8s_yaml['kubespray_version'][1:]}-k8s-{args.k8s_version[1:]}_{args.image_arch}"
offline_dir = f"{store_offline_path}/base_k8s_{args.k8s_version}"
# 创建离线包目录
if not os.path.exists(offline_dir):
    os.makedirs(f"{offline_dir}/system_app/metric_server/images")
    os.makedirs(f"{offline_dir}/k8s_cache/{args.k8s_version}/images")
    os.makedirs(f"{offline_dir}/network_plugins/flannel/{k8s_yaml['network_plugins'][0]['dependency']['images'][0]['version']}/images")
    print(f"离线包目录 '{offline_dir}' 创建成功")
else:
    print(f"离线包目录 '{offline_dir}' 已经存在")

base_files = []
base_images = []
# 基本依赖文件
for store_item in k8s_yaml['dependency']['files']:
    base_files.append(store_item)
# 基本依赖镜像
for store_item in k8s_yaml['dependency']['images']:
    base_images.append(store_item)
# 网络插件
network_images = k8s_yaml['network_plugins'][0]['dependency']['images']
# 第三方系统软件
third_images = k8s_yaml['system_app'][0]['dependency']['images']

# 下载文件
for file_item in base_files:
    file_name = file_item['name']
    file_version = file_item['version']
    # 读取下载链接
    file_url = download_url_yaml['files'][f'{file_name}_url']
    # 对file_url进行中的版本和image_arch进行替换
    file_url = file_url.replace("{{ version }}", file_version)
    file_url = file_url.replace("{{ image_arch }}", image_arch)
    # 读取下载过后的文件名
    download_filename = file_url.split('/')[-1]
    # 输出下载链接
    # print(f"下载链接为: {file_url}")
    # 使用 wget 下载文件到指定目录，文件名保持不变
    subprocess.run(['wget', file_url, '-P', {offline_dir}], check=True)
    print(f"下载文件{file_name}到{offline_dir}")

    save_filename = file_item['filename']
    save_filename = save_filename.replace("{{ image_arch }}", image_arch)
    if file_name in ['kubeadm', 'kubelet', 'kubectl']:
        save_filename = save_filename.replace("{{ kube_version }}", file_version)
    if file_name == 'runc':
        save_filename = f'runc-{file_version}.{ image_arch }'

    subprocess.run(['mv', f'{offline_dir}/{download_filename}', f'{offline_dir}/k8s_cache/{args.k8s_version}/{save_filename}'], check=True)
    print(f"移动文件{offline_dir}/{download_filename}到{offline_dir}/k8s_cache/{args.k8s_version}/{save_filename}")
# 拉取镜像
for image_item in base_images:
    image_name = image_item['name']
    image_version = image_item['version']
    image_repo = download_url_yaml['images'][f'{image_name}_repo']
    # 输出拉取镜像地址
    print(f"拉取镜像地址为: {image_repo}:{image_version}")
    # 使用 docker pull 拉取镜像
    subprocess.run(['docker', 'pull', f'{image_repo}:{image_version}'], check=True)

    image_tag = image_item['tag'][16:]
    # 重新打tag
    subprocess.run(f"docker tag {image_repo}:{image_version} {args.image_registry}/{image_tag}:{image_item['version']}", shell=True)
    #
    image_tar_name = f'{args.image_registry}/{image_tag}'.replace("/", "_")
    # 使用save命令保存镜像
    subprocess.run(['docker', 'save', '-o', f'{offline_dir }/k8s_cache/{args.k8s_version}/images/{image_tar_name}_{image_item["version"]}.tar', f'{args.image_registry}/{image_tag}:{image_item["version"]}'], check=True)
    print(f'-------------save {image_tar_name}_{image_item["version"]}.tar')
    # 删除镜像  
    subprocess.run(['docker', 'rmi', f'{image_repo}:{image_version}'], check=True)
    subprocess.run(['docker', 'rmi', f'{args.image_registry}/{image_tag}:{image_item["version"]}'], check=True)

for image_item in network_images:
    image_name = image_item['name']
    image_version = image_item['version']
    image_repo = download_url_yaml['images'][f'{image_name}_repo']
    # 输出拉取镜像地址
    print(f"拉取镜像地址为: {image_repo}:{image_version}")

    image_tag = image_item['tag'][16:]
    subprocess.run(f"docker pull {image_repo}:{image_version}", shell=True)
    # 重新打tag
    subprocess.run(f"docker tag {image_repo}:{image_version} {args.image_registry}/{image_tag}:{image_item['version']}", shell=True)
    #
    image_tar_name = f'{args.image_registry}/{image_tag}'.replace("/", "_")
    # 使用save命令保存镜像
    subprocess.run(['docker', 'save', '-o', f'{offline_dir}/network_plugins/flannel/{k8s_yaml["network_plugins"][0]["dependency"]["images"][0]["version"]}/images/{image_tar_name}_{image_item["version"]}.tar', f'{args.image_registry}/{image_tag}:{image_item["version"]}'], check=True)
    print(f'-------------save {image_tar_name}_{image_item["version"]}.tar')
    # 删除镜像  
    subprocess.run(['docker', 'rmi', f'{image_repo}:{image_version}'], check=True)
    subprocess.run(['docker', 'rmi', f'{args.image_registry}/{image_tag}:{image_item["version"]}'], check=True)

for image_item in third_images:
    image_name = image_item['name']
    image_version = image_item['version']
    image_repo = download_url_yaml['images'][f'{image_name}_repo']
    # 输出拉取镜像地址
    print(f"拉取镜像地址为: {image_repo}:{image_version}")

    image_tag = image_item['tag'][16:]
    subprocess.run(f"docker pull {image_repo}:{image_version}", shell=True)
    # 重新打tag
    subprocess.run(f"docker tag {image_repo}:{image_version} {args.image_registry}/{image_tag}:{image_item['version']}", shell=True)
    #
    image_tar_name = f'{args.image_registry}/{image_tag}'.replace("/", "_")
    # 使用save命令保存镜像
    subprocess.run(['docker', 'save', '-o', f'{offline_dir  }/system_app/metric_server/images/{image_tar_name}_{image_item["version"]}.tar', f'{args.image_registry}/{image_tag}:{image_item["version"]}'], check=True)
    print(f'-------------save {image_tar_name}_{image_item["version"]}.tar')
    # 删除镜像  
    subprocess.run(['docker', 'rmi', f'{image_repo}:{image_version}'], check=True)
    subprocess.run(['docker', 'rmi', f'{args.image_registry}/{image_tag}:{image_item["version"]}'], check=True)
# 压缩为基础压缩包
subprocess.run(['tar', '-cvzf', f"{offline_dir}.tgz", '-C', f'{offline_dir.rsplit("/", 1)[0]}', f'{offline_dir.rsplit("/", 1)[1]}'])
print(f'-------tar {offline_dir}.tgz')
# 删除原来的目录
subprocess.run(['rm', '-rf', f'{offline_dir}'], check=True)


