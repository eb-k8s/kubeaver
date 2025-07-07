
#!/bin/bash
set -e

dnf clean all
dnf makecache
# 先安装dnf-plugins-core
dnf install -y dnf-plugins-core
# 安装createrepo
dnf install -y createrepo

mapfile -t PKGS < <(cat ../oslib/openeuler | grep -v "^#" | sort | uniq)

CACHEDIR=./cache-rpms
mkdir -p $CACHEDIR


# 循环处理每个包
for pkg in "${PKGS[@]}"; do
   repotrack $pkg --downloaddir=$CACHEDIR
done

createrepo $CACHEDIR

# 用tar打包为extend_openEuler_22.03_LTS-SP4.tgz
tar -czf extend_openEuler_22.03_LTS-SP4.tgz $CACHEDIR

echo "create-repo done."
