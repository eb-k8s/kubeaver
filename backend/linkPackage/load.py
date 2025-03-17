import os

def get_current_path():
    return os.getcwd()

current_path = get_current_path()
# 定义源目录列表和目标目录
source_dirs = [os.path.join(current_path, './data/offline/k8s_cache'), os.path.join(current_path, './data/offline/network_plugins'), os.path.join(current_path, './data/offline/system_app')]
target_dir = os.path.join(current_path, './data/offline/all_files')

# 删除目标目录下的所有软链接
if os.path.exists(target_dir):
    for root, dirs, files in os.walk(target_dir, topdown=False):
        for name in files:
            file_path = os.path.join(root, name)
            if os.path.islink(file_path):
                try:
                    os.unlink(file_path)
                    print(f'Deleted symlink: {file_path}')
                except OSError as e:
                    print(f'Error deleting symlink: {e}')

# 确保目标目录存在
if not os.path.exists(target_dir):
    os.makedirs(target_dir)

# 遍历每个源目录及其子目录中的所有文件
for source_dir in source_dirs:
    if os.path.exists(source_dir):
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                # 获取文件的完整路径
                source_file_path = os.path.join(root, file)
                
                # 检查文件是否在images目录下
                if 'images' in root.split(os.sep):
                    # 创建目标文件的路径在all_files/images目录下
                    images_target_dir = os.path.join(target_dir, 'images')
                    
                    # 确保images目标目录存在
                    if not os.path.exists(images_target_dir):
                        os.makedirs(images_target_dir)
                    
                    target_file_path = os.path.join(images_target_dir, file)
                else:
                    # 创建目标文件的路径在all_files目录下
                    target_file_path = os.path.join(target_dir, file)
                
                # 如果目标文件不存在或不是软链接，则创建软链接
                if not os.path.exists(target_file_path) and not os.path.islink(target_file_path):
                    try:
                        os.symlink(source_file_path, target_file_path)
                        print(f'Created symlink: {target_file_path} -> {source_file_path}')
                    except OSError as e:
                        print(f'Error creating symlink: {e}')
                else:
                    print(f'Symlink already exists or file is present: {target_file_path}')
    else:
        print(f'Source directory does not exist: {source_dir}')

print('All symlinks created successfully.')



