
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

# 设置变量，描述新建目录名
EXTEND_DIR=openEuler_22.03_LTS-SP4
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
