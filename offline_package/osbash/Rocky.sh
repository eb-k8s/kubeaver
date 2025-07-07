#!/bin/bash
set -e

dnf clean all
dnf makecache
# 安装createrepo
dnf install -y createrepo

mapfile -t PKGS < <(cat ../oslib/rocky | grep -v "^#" | sort | uniq)

CACHEDIR=./cache-rpms
mkdir -p $CACHEDIR

# 循环处理每个包
for pkg in "${PKGS[@]}"; do
   dnf install --downloadonly  --destdir $CACHEDIR "$pkg" -y --allowerasing
done

createrepo $CACHEDIR

# 用tar打包为extend_Rocky_9.5_Blue_Onyx.tgz
tar -czf extend_Rocky_9.5_Blue_Onyx.tgz $CACHEDIR

echo "create-repo done."
