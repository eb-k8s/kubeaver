#!/bin/bash

# 设置direnv
#echo 'source /root/python_env/kubespray-2.23/bin/activate' > .envrc
#direnv allow
pyenv local 3.12.4
# 设置要查找的文件路径
FILES=("kubespray/cluster.yml" "kubespray/scale.yml" "kubespray/reset.yml" "kubespray/upgrade-cluster.yml")

# 循环处理每个文件
for FILE in "${FILES[@]}"; do
    # 检查文件是否存在
    if [[ ! -f "$FILE" ]]; then
        echo "File $FILE does not exist."
        continue
    fi

    # 检查要添加的内容是否已经存在
    if grep -q "pre_playbook" "$FILE"; then
        echo "The content is already present in $FILE."
        continue
    fi

    # 创建一个临时文件以存储修改后的内容
    TEMP_FILE=$(mktemp)

    # 读取原始文件并添加新内容
    {
        # 读取第一行
        read -r first_line
        echo "$first_line"
        echo "- name: pre_playbook"
        echo "  ansible.builtin.import_playbook: ../pre_playbook.yml"
        
        # 读取剩余的内容
        cat
    } < "$FILE" > "$TEMP_FILE"

    # 替换原文件
    mv "$TEMP_FILE" "$FILE"

    echo "Added new content to $FILE."
done

FILES=("kubespray/cluster.yml" "kubespray/scale.yml" )

# 循环处理每个文件
for FILE in "${FILES[@]}"; do
    # 检查文件是否存在
    if [[ ! -f "$FILE" ]]; then
        echo "File $FILE does not exist."
        continue
    fi

    # 检查要添加的内容是否已经存在
    if grep -q "../reset.yml" "$FILE"; then
        echo "The content is already present in $FILE."
        continue
    fi

    # 创建一个临时文件以存储修改后的内容
    TEMP_FILE=$(mktemp)

    # 读取原始文件并添加新内容
    {
        # 读取第一行
        read -r first_line
        echo "$first_line"
        echo "- name: force_reset_playbook"
        echo "  ansible.builtin.import_playbook: ../reset.yml"
        
        # 读取剩余的内容
        cat
    } < "$FILE" > "$TEMP_FILE"

    # 替换原文件
    mv "$TEMP_FILE" "$FILE"

    echo "Added new content to $FILE."
done

