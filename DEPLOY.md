# 生产部署指南

## 环境要求

- 云服务器：CentOS 7/8
- 域名（已解析到服务器 IP）
- 服务器最低配置：2 核 4GB RAM

---

## 目录

1. [服务器初始化](#1-服务器初始化)
2. [安装 Docker](#2-安装-docker)
3. [上传代码](#3-上传代码)
4. [配置环境变量](#4-配置环境变量)
5. [申请 SSL 证书](#5-申请-ssl-证书)
6. [启动服务](#6-启动服务)
7. [导入数据库数据](#7-导入数据库数据)
8. [验证部署](#8-验证部署)
9. [后续更新](#9-后续更新)
10. [常用运维命令](#10-常用运维命令)
11. [故障排查](#11-故障排查)

---

## 1. 服务器初始化

SSH 登录服务器后，先更新系统并开放必要端口。

```bash
# 更新系统
sudo yum update -y

# 开放 HTTP / HTTPS 端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# 确认端口已开放
sudo firewall-cmd --list-ports
```

> **云服务商控制台也需要配置安全组**，放行 TCP 80 和 443 端口（阿里云/腾讯云/AWS 均有安全组设置）。

---

## 2. 安装 Docker

```bash
# 添加 Docker 官方 yum 源
sudo yum install -y yum-utils
sudo yum-config-manager \
    --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker 及 Compose 插件
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户加入 docker 组（避免每次 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version
docker compose version
```

---

## 3. 上传代码

### 方案 A：从 Git 仓库克隆（推荐）

```bash
# 在服务器上克隆代码
git clone https://github.com/你的用户名/你的仓库.git /opt/materials-app
cd /opt/materials-app
```

### 方案 B：从本地直接上传

在本地 Windows 终端（PowerShell 或 Git Bash）执行：

```bash
# 将整个项目目录上传到服务器
scp -r F:/DataBaseAPI root@服务器IP:/opt/materials-app
```

然后 SSH 登录服务器：

```bash
ssh root@服务器IP
cd /opt/materials-app
```

---

## 4. 配置环境变量

```bash
# 进入项目目录
cd /opt/materials-app

# 从模板复制一份 .env
cp .env.production .env

# 编辑 .env（用 nano 或 vim）
nano .env
```

将 `.env` 中的占位符替换为真实值：

```env
# 你的域名（不带 https://）
DOMAIN=your-domain.com

# 证书申请邮箱（接收 Let's Encrypt 到期提醒）
CERT_EMAIL=admin@your-domain.com

# 数据库密码（设置强密码）
DB_USER=materials
DB_PASSWORD=请替换为强密码_至少16位
DB_NAME=materials_db

# Redis 密码
REDIS_PASSWORD=请替换为强密码

# 其余保持默认即可
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=5
CACHE_TTL=300
LOG_LEVEL=INFO
```

保存退出（nano：`Ctrl+O` → `Enter` → `Ctrl+X`）。

---

## 5. 申请 SSL 证书

> **前提**：你的域名 DNS A 记录已指向服务器 IP，并且已完全生效（可用 `ping your-domain.com` 验证）。

```bash
# 添加执行权限
chmod +x init-letsencrypt.sh

# 运行证书申请脚本
bash init-letsencrypt.sh
```

脚本会自动完成以下操作：

1. 临时启动 HTTP Nginx 接受 Let's Encrypt 的域名验证
2. 调用 Certbot 向 Let's Encrypt 申请免费证书（有效期 90 天）
3. 将你的域名自动写入 `nginx/nginx.conf`

**脚本输出正常结尾示例：**

```
>>> Certificate obtained successfully!
>>> Run 'docker compose up -d' to start all services.
```

---

## 6. 启动服务

```bash
# 构建镜像并以守护进程模式启动全部服务
docker compose up -d --build

# 查看各服务状态（全部 healthy/running 即正常）
docker compose ps
```

正常输出示例：

```
NAME                STATUS
materials-db-1      healthy
materials-redis-1   healthy
materials-backend-1 running
materials-frontend-1 running
materials-nginx-1   running
materials-certbot-1 running
```

---

## 7. 导入数据库数据

首次部署需要将 `ALL_INFO.sql` 数据导入数据库：

```bash
# 等待数据库完全就绪（约 10 秒）
docker compose exec db pg_isready -U materials

# 导入 SQL 数据
docker compose exec -T db psql \
    -U materials \
    -d materials_db \
    < ALL_INFO.sql
```

导入完成后验证：

```bash
# 进入数据库查看表
docker compose exec db psql -U materials -d materials_db -c "\dt"
```

---

## 8. 验证部署

```bash
# 测试 HTTP 是否自动跳转 HTTPS
curl -I http://your-domain.com

# 测试 HTTPS 是否正常
curl -I https://your-domain.com

# 测试后端 API 健康检查
curl https://your-domain.com/health

# 测试 API 接口
curl https://your-domain.com/api/v1/materials
```

打开浏览器访问 `https://your-domain.com`，应看到前端页面并显示绿色锁图标（证书有效）。

---

## 9. 后续更新

每次代码有更新时，在服务器上执行：

```bash
cd /opt/materials-app

# 如果使用 Git 管理代码
bash deploy.sh
```

`deploy.sh` 会自动：`git pull` → 重建 backend/frontend 镜像 → 滚动重启 → 清理旧镜像。

---

## 10. 常用运维命令

### 查看日志

```bash
# 查看所有服务日志（实时）
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 只看 Nginx 日志
docker compose logs -f nginx
```

### 重启服务

```bash
# 重启单个服务
docker compose restart backend

# 重启所有服务
docker compose restart
```

### 停止/启动

```bash
docker compose stop     # 停止（不删除容器）
docker compose start    # 重新启动
docker compose down     # 停止并删除容器（数据卷保留）
```

### 手动续期证书

```bash
# 证书自动续期已内置在 certbot 容器中（每 12 小时检查一次）
# 手动触发续期：
docker compose exec certbot certbot renew --quiet

# 续期后重载 Nginx
docker compose exec nginx nginx -s reload
```

### 数据库备份

```bash
# 备份数据库到本地文件
docker compose exec db pg_dump -U materials materials_db > backup_$(date +%Y%m%d).sql

# 恢复备份
docker compose exec -T db psql -U materials materials_db < backup_20250101.sql
```

### 清理磁盘空间

```bash
# 清理无用镜像
docker image prune -f

# 清理无用容器、网络、镜像（谨慎使用）
docker system prune -f
```

---

## 11. 故障排查

### 问题：证书申请失败

**原因**：域名 DNS 尚未生效，或 80 端口未开放。

```bash
# 检查域名解析
ping your-domain.com

# 检查 80 端口是否可达（在本地执行）
curl -I http://your-domain.com
```

### 问题：后端启动失败（数据库连接错误）

```bash
# 查看后端日志
docker compose logs backend

# 确认数据库已就绪
docker compose exec db pg_isready -U materials
```

### 问题：前端显示空白 / 404

```bash
# 检查前端容器日志
docker compose logs frontend

# 检查 Nginx 配置是否有语法错误
docker compose exec nginx nginx -t
```

### 问题：API 请求 502 Bad Gateway

```bash
# 检查后端是否在运行
docker compose ps backend

# 检查后端健康检查
curl http://localhost:8000/health   # 在服务器上执行，需进入容器网络
docker compose exec backend curl http://localhost:8000/health
```

### 问题：数据库数据丢失

数据存储在 Docker volume `postgres_data` 中，`docker compose down` 不会删除 volume。
只有 `docker compose down -v` 才会删除 volume，**生产环境不要执行此命令**。

```bash
# 查看 volume 状态
docker volume ls
docker volume inspect materials-app_postgres_data
```

---

## 架构总览

```
用户请求 (HTTPS)
       │
       ▼
  ┌─────────────────────────────┐
  │   Nginx  :443/:80           │  ← SSL 证书由 Let's Encrypt 提供
  │   自动 HTTP → HTTPS 跳转    │    证书每 90 天自动续期
  └──────────┬──────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  /api/*          /  (其余路径)
      │             │
      ▼             ▼
 ┌─────────┐   ┌──────────┐
 │ backend │   │ frontend │   ← React 静态文件由内层 Nginx 提供
 │ FastAPI │   │  Nginx   │
 │ :8000   │   │  :80     │
 └────┬────┘   └──────────┘
      │
   ┌──┴──────────┐
   │             │
   ▼             ▼
┌──────┐    ┌───────┐
│  db  │    │ redis │
│ PG16 │    │  R7   │
└──────┘    └───────┘
```

---

## 文件结构说明

```
materials-app/
├── backend/
│   ├── Dockerfile          # Python 3.11 + FastAPI
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile          # pnpm build + Nginx
│   ├── nginx.conf          # 前端 SPA Nginx 配置
│   └── .dockerignore
├── nginx/
│   ├── nginx.conf          # 生产 Nginx（SSL + 反向代理）
│   └── nginx-init.conf     # 申请证书时的临时配置
├── docker-compose.yml      # 生产 Compose 配置
├── .env.production         # 环境变量模板
├── .env                    # 实际环境变量（不提交 Git）
├── init-letsencrypt.sh     # 首次申请证书脚本
└── deploy.sh               # 后续更新部署脚本
```
