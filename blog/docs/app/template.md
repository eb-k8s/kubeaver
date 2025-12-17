# 应用制作规范

本文档基于 `nginx-0.1.0` 示例的结构，定义了应用包的制作规范。

## 目录结构

一个标准的应用包目录（例如 `appName-version`）应包含以下文件和目录：

```text
appName-version/
├── appName-version.tgz     # Helm Chart 包
├── app.yaml                # 应用描述文件
└── image/                  # 镜像文件目录
    |── appName.tar         # Docker 镜像压缩包
```

##  文件说明

###  Helm Chart 包 (`.tgz`)
- 必须包含应用的 Helm Chart 压缩包。
- 命名格式通常为 `应用名-版本号.tgz`。
- chart包中value.yaml文件中image字段的name值必须与app.yaml中image字段的name值一致。
- 内置的镜像仓库为`store.e-byte.cn`。

###  应用描述文件 (`app.yaml`)
- 该文件用于描述应用的 Chart 包和镜像信息。
- **格式示例**：

```yaml
chart: nginx-0.1.0.tgz          # 指定 Chart 包的文件名
image:
  - name: store.e-byte.cn/nginx:1.27-alpine  # 镜像的完整名称（仓库/名称:标签）
    path: image/nginx.tar       # 镜像文件在包内的相对路径
  - name: store.e-byte.cn/redis:alpine  # 多个镜像示例
    path: image/redis.tar
  - name: store.e-byte.cn/postgres:13
    path: image/postgres.tar
```

###  镜像目录 (`image/`)
- 用于存放应用的 Docker 镜像文件。
- 镜像通常通过 `docker save` 命令导出为 `.tar` 格式。
- 如果有多个镜像，可以使用 `docker save -o nginx.tar nginx:latest redis:alpine postgres:13`，并在 `app.yaml` 的 `image` 列表中进行配置。

##  示例参考

### 示例 : Nginx
**目录结构**:
```text
nginx-0.1.0/
├── nginx-0.1.0.tgz  ##chart包中存放values.yaml文件
├── app.yaml
└── image/
    ├── nginx.tar    ##镜像文件在包内的相对路径
```

**app.yaml**:
```yaml
chart: nginx-0.1.0.tgz
image:
  - name: store.e-byte.cn/nginx:1.27-alpine
    path: image/nginx.tar
```

**values.yaml**
```yaml
image:
  repository: store.e-byte.cn/nginx
  tag: 1.27-alpine
```

##  打包应用包

- 完成应用目录结构后，使用 `tar` 命令打包应用目录，命名为 `应用名-版本号.tgz`。
- 例如：
```ShellSession
tar -czvf nginx-0.1.0.tgz nginx-0.1.0/
```

