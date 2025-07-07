#!/bin/bash
set -e

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

# 用tar打包为extend_CentOS_7_Core.tgz
tar -czf extend_CentOS_7_Core.tgz $CACHEDIR


echo "create-repo done."
