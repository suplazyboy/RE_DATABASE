# 生产环境部署指南

> 适用环境：CentOS / OpenCloudOS，服务器已有 Nginx + SSL 证书，已有 PostgreSQL 数据库（`re_materials`）。
> Docker Compose 仅负责运行 Backend、Frontend、Redis，SSL 终止和反向代理由宿主机 Nginx 完成。

---

## 目录

1. [服务器环境准备](#1-服务器环境准备)
2. [配置 PostgreSQL 允许 Docker 访问](#2-配置-postgresql-允许-docker-访问)
3. [上传项目代码](#3-上传项目代码)
4. [配置环境变量](#4-配置环境变量)
5. [配置宿主机 Nginx](#5-配置宿主机-nginx)
6. [启动 Docker 服务](#6-启动-docker-服务)
7. [验证部署](#7-验证部署)
8. [后续更新](#8-后续更新)
9. [常用运维命令](#9-常用运维命令)
10. [故障排查](#10-故障排查)

---

## 1. 服务器环境准备

### 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# （可选）允许当前用户免 sudo 使用 docker
sudo usermod -aG docker $USER
newgrp docker
```

### 安装 Docker Compose Plugin

```bash
# CentOS / OpenCloudOS
sudo yum install -y docker-compose-plugin

# 验证
docker compose version
```

---

## 2. 配置 PostgreSQL 允许 Docker 访问

Backend 容器通过 `host.docker.internal` 访问宿主机 PostgreSQL，需要以下两处配置。

### 修改 `postgresql.conf`，监听所有地址

```bash
# 查找配置文件位置
sudo -u postgres psql -c "SHOW config_file;"

sudo vim /var/lib/pgsql/data/postgresql.conf
```

找到并修改：

```
listen_addresses = '*'
```

### 修改 `pg_hba.conf`，允许 Docker 网段连接

```bash
sudo vim /var/lib/pgsql/data/pg_hba.conf
```

末尾追加：

```
# Allow Docker bridge network
host  all  all  172.17.0.0/16  md5
```

### 重启 PostgreSQL

```bash
sudo systemctl restart postgresql
# 或（按实际版本）
sudo systemctl restart postgresql-14
```

### 验证

```bash
psql -h 127.0.0.1 -U user -d re_materials -c "\dt"
```

---

## 3. 上传项目代码

### 方式一：Git 克隆（推荐）

```bash
cd /opt
git clone <your-repo-url> materials-app
cd materials-app
```

### 方式二：本地 scp 上传

```bash
scp -r F:/DataBaseAPI root@<服务器IP>:/opt/materials-app
```

---

## 4. 配置环境变量

```bash
cd /opt/materials-app
cp .env.production .env
vim .env
```

**只需修改 `DOMAIN` 和 `REDIS_PASSWORD`**，其余已填好：

```env
# 你的域名（不含 https://）
DOMAIN=polart.cloud

# PostgreSQL（宿主机已有数据库）
DB_USER=user
DB_PASSWORD=8Ds4Nz5LAKM63Nnj
DB_NAME=re_materials

# Redis 密码（自定义强密码）
REDIS_PASSWORD=your_strong_redis_password

# 连接池
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=5

# 缓存 TTL（秒）
CACHE_TTL=300

# 日志级别
LOG_LEVEL=INFO
```

---

## 5. 配置宿主机 Nginx

Docker 服务启动后会监听：
- Frontend：`127.0.0.1:3000`
- Backend API：`127.0.0.1:8000`

在宿主机 Nginx 配置目录新增一个配置文件：

```bash
sudo vim /etc/nginx/conf.d/materials-app.conf
```

写入以下内容（将域名和证书路径替换为实际值）：

```nginx
# HTTP → HTTPS 跳转
server {
    listen 80;
    server_name polart.cloud www.polart.cloud;
    return 301 https://$host$request_uri;
}

# HTTPS 主服务
server {
    listen 443 ssl;
    http2 on;
    server_name polart.cloud www.polart.cloud;

    # 替换为服务器上实际的证书路径
    ssl_certificate     /etc/nginx/ssl/polart.cloud.crt;
    ssl_certificate_key /etc/nginx/ssl/polart.cloud.key;

    # 安全响应头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 20M;

    # 前端（React SPA）
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # 后端 API
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_read_timeout    120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout    120s;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
```

> **证书路径说明**：
> - 宝塔面板证书通常在 `/www/server/panel/vhost/cert/polart.cloud/`
> - Let's Encrypt 证书通常在 `/etc/letsencrypt/live/polart.cloud/`
> - 腾讯云/阿里云下载的证书，路径以实际上传位置为准

检查配置语法并重载 Nginx：

```bash
sudo nginx -t
sudo nginx -s reload
```

---

## 6. 启动 Docker 服务

```bash
cd /opt/materials-app
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
```

期望输出：

```
NAME        STATUS
redis       running (healthy)
backend     running (healthy)
frontend    running
```

---

## 7. 验证部署

```bash
# 后端健康检查（直接访问容器端口）
curl http://127.0.0.1:8000/health

# 前端可访问（直接访问容器端口）
curl -I http://127.0.0.1:3000

# 通过 HTTPS 完整链路
curl -I https://polart.cloud
curl https://polart.cloud/api/v1/materials
```

浏览器访问 `https://polart.cloud`，显示前端页面即部署成功。

---

## 8. 后续更新

```bash
cd /opt/materials-app
bash deploy.sh
```

`deploy.sh` 自动完成：`git pull` → 重建镜像 → 滚动重启 → 清理旧镜像。

---

## 9. 常用运维命令

```bash
# 查看日志（实时）
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# 重启单个服务
docker compose restart backend

# 停止所有服务
docker compose down

# 进入容器调试
docker compose exec backend bash
```

---

## 10. 故障排查

### 后端无法连接数据库

```bash
# 查看错误日志
docker compose logs backend

# 在容器内测试数据库连接
docker compose exec backend python -c \
  "import asyncio, asyncpg; asyncio.run(asyncpg.connect('postgresql://user:8Ds4Nz5LAKM63Nnj@host.docker.internal:5432/re_materials'))"
```

常见原因：
- `pg_hba.conf` 未添加 Docker 网段 → 重新添加并 `systemctl restart postgresql`
- `listen_addresses` 未设为 `'*'` → 修改后重启 PostgreSQL

### Nginx 502 Bad Gateway

```bash
# 确认 Docker 服务在运行
docker compose ps

# 确认端口已绑定
ss -tlnp | grep -E '3000|8000'
```

### 宿主机 Nginx 配置报错

```bash
sudo nginx -t    # 检查配置语法
sudo nginx -s reload
```

---

## 架构说明

```
用户请求 (HTTPS)
       │
       ▼
┌─────────────────────────────┐
│  宿主机 Nginx  :80 / :443   │  ← 使用服务器已有 SSL 证书
│  HTTP 自动跳转 HTTPS        │
└──────────┬──────────────────┘
           │
     ┌─────┴──────────┐
     │                │
     ▼                ▼
/api/*              / (其余)
127.0.0.1:8000    127.0.0.1:3000
     │                │
     ▼                ▼
┌─────────┐      ┌──────────┐
│ backend │      │ frontend │  Docker 容器
│ FastAPI │      │  Nginx   │
└────┬────┘      └──────────┘
     │
  ┌──┴────────────────┐
  │                   │
  ▼                   ▼
PostgreSQL (宿主机)  Redis (Docker 容器)
re_materials
```

---

## 文件结构

```
materials-app/
├── backend/
│   ├── Dockerfile
│   └── app/
├── frontend/
│   ├── Dockerfile
│   └── nginx.conf          # 前端容器内部的 SPA 路由配置
├── docker-compose.yml      # 仅含 backend、frontend、redis
├── .env.production         # 环境变量模板
├── .env                    # 实际配置（不提交 Git）
└── deploy.sh               # 更新部署脚本
```
