#!/bin/bash
set -e

# 首先对CentOS7的yum进行换源，使用阿里云的yum源
sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/CentOS-*
sed -i 's|^#baseurl=http://mirror.centos.org|baseurl=https://mirrors.aliyun.com|g' /etc/yum.repos.d/CentOS-*

yum clean all
yum makecache
# 安装createrepo
yum install -y createrepo

mapfile -t PKGS < <(cat ../oslib/centos7 | grep -v "^#" | sort | uniq)

CACHEDIR=./cache-rpms
mkdir -p $CACHEDIR

# 循环处理每个包
for pkg in "${PKGS[@]}"; do
   repotrack $pkg --download_path=$CACHEDIR
done

createrepo $CACHEDIR

# 设置变量，描述新建目录名
EXTEND_DIR=CentOS_7_Core
# 新建目录
mkdir -p extend_$EXTEND_DIR/repo_files/$EXTEND_DIR
# 先重命名为repo
mv $CACHEDIR repo
# 用tar打包为repo.tgz
tar -czf repo.tgz repo
# 将repo.tgz放入repo_files目录下
mv repo.tgz extend_$EXTEND_DIR/repo_files/$EXTEND_DIR
# 将repo/pkgs目录下的tar开头的文件拷贝到extend_$EXTEND_DIR/repo_files/$EXTEND_DIR目录下
cp repo/tar*.rpm extend_$EXTEND_DIR/repo_files/$EXTEND_DIR
# 并且将该文件重命名为tar.rpm
mv extend_$EXTEND_DIR/repo_files/$EXTEND_DIR/tar*.rpm extend_$EXTEND_DIR/repo_files/$EXTEND_DIR/tar.rpm
# 将extend_$EXTEND_DIR压缩为extend_$EXTEND_DIR.tgz
tar -czf ../extend_$EXTEND_DIR.tgz extend_$EXTEND_DIR

echo "create-repo done."
