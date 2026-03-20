# Docker 容器化部署指南

## 📋 概述
本文档提供 Crystal Materials Database 项目的完整 Docker 容器化部署流程，涵盖生产环境和开发环境的配置、部署、运维及故障排除。

## 🔄 Docker 容器是否需要重新构建？

### 1. **开发模式**（使用 `docker-compose.dev.yml`）
- ✅ **无需重新构建**：代码通过卷挂载（`volumes: ./backend:/app`），修改立即生效
- 只需重启服务：`docker-compose restart backend`

### 2. **生产模式**（使用 `docker-compose.yml`）
- 🔄 **需要重新构建**：代码在构建时复制到镜像中，修改后必须：
  ```bash
  docker-compose up --build -d
  ```

### 3. **依赖变更时**
- 修改 `requirements.txt` 或 `package.json` → **必须重新构建**
- 修改 `Dockerfile` 或 `nginx.conf` → **必须重新构建**

---

## 🚀 Docker 部署完整流程

### 📁 项目结构准备
```
F:\DataBaseAPI\
├── .env                    # 环境变量
├── docker-compose.yml      # 生产配置
├── docker-compose.dev.yml  # 开发配置
├── backend/Dockerfile      # 后端镜像
└── frontend/Dockerfile     # 前端镜像
```

### 1. **环境配置**
```bash
# 编辑环境变量（重要！）
cd F:\DataBaseAPI
notepad .env
```
修改以下内容：
```env
# 数据库（必须修改！）
DB_USER=materials
DB_PASSWORD=your_secure_password_here  # ← 修改为强密码
DB_NAME=materials_db
```

### 2. **生产环境部署（推荐）**
```bash
# 首次启动（构建镜像 + 启动服务）
docker-compose up --build -d

# 查看启动日志
docker-compose logs -f

# 查看单个服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 检查服务状态
docker-compose ps

# 访问应用
# 前端：http://localhost
# 后端API文档：http://localhost:8000/docs
# 健康检查：http://localhost:8000/health
```

### 3. **开发环境部署**
```bash
# 使用开发配置（热重载）
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# 访问
# 前端开发服务器：http://localhost:5173
# 后端：http://localhost:8000/docs
```

### 4. **日常运维命令**
```bash
# 停止所有服务（保留数据卷）
docker-compose down

# 停止并删除数据卷（清除数据库）
docker-compose down -v

# 重启单个服务
docker-compose restart backend

# 查看容器资源使用
docker stats

# 进入容器调试
docker-compose exec backend bash
docker-compose exec db psql -U materials -d materials_db
```

### 5. **更新代码后的重新部署**
```bash
# 方法1：完全重建（生产环境）
docker-compose down
docker-compose up --build -d

# 方法2：仅重建修改的服务
docker-compose up --build -d backend  # 只重建后端

# 方法3：开发模式（代码修改立即生效）
# 无需重启，保存文件自动重载
```

### 6. **数据管理**
```bash
# 备份数据库
docker-compose exec db pg_dump -U materials materials_db > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T db psql -U materials materials_db

# 查看数据卷
docker volume ls

# 清理未使用的资源
docker system prune -a
```

---

## 🔍 部署验证清单

| 步骤 | 命令 | 预期结果 |
|------|------|----------|
| 1. 构建 | `docker-compose build` | 所有镜像构建成功 |
| 2. 启动 | `docker-compose up -d` | 所有服务状态 "Up" |
| 3. 健康检查 | `curl http://localhost:8000/health` | `{"status":"healthy","database":"connected"}` |
| 4. 前端访问 | 浏览器打开 `http://localhost` | 显示应用界面 |
| 5. API文档 | 浏览器打开 `http://localhost:8000/docs` | Swagger UI 界面 |
| 6. 数据库连接 | `docker-compose exec db psql -U materials -c "SELECT 1;"` | 返回 `?column?` = 1 |

---

## ⚠️ 常见问题解决

### 1. **端口冲突**
```bash
# 修改 docker-compose.yml 中的 ports
backend:
  ports:
    - "8001:8000"  # 主机端口:容器端口

frontend:
  ports:
    - "8080:80"
```

### 2. **构建缓存问题**
```bash
# 强制重新构建（忽略缓存）
docker-compose build --no-cache

# 清除Docker缓存
docker builder prune
```

### 3. **权限问题（Windows）**
```bash
# 以管理员运行 Docker Desktop
# 或使用 Git Bash 管理员模式
```

### 4. **数据库连接失败**
```bash
# 检查数据库服务
docker-compose logs db

# 手动测试连接
docker-compose exec db pg_isready -U materials
```

---

## 📊 部署模式对比

| 场景 | 配置文件 | 代码更新 | 适用阶段 |
|------|----------|----------|----------|
| **生产部署** | `docker-compose.yml` | 需要重新构建 | 测试/生产环境 |
| **开发调试** | `docker-compose.dev.yml` | 实时热重载 | 开发阶段 |
| **CI/CD** | `docker-compose.yml` + `.env.prod` | 自动构建 | 自动化部署 |

---

## 🎯 快速开始脚本
创建 `deploy.sh`：
```bash
#!/bin/bash
# 快速部署脚本
cd F:\DataBaseAPI

echo "1. 停止现有服务..."
docker-compose down

echo "2. 构建新镜像..."
docker-compose build

echo "3. 启动服务..."
docker-compose up -d

echo "4. 等待服务就绪..."
sleep 10

echo "5. 检查状态..."
docker-compose ps

echo "✅ 部署完成！"
echo "前端：http://localhost"
echo "API文档：http://localhost:8000/docs"
```

运行：
```bash
bash deploy.sh
```

---

## 📞 快速参考

### 服务端口映射
- **前端**: 80 → http://localhost
- **后端**: 8000 → http://localhost:8000
- **数据库**: 5432 → localhost:5432
- **Redis**: 6379 → localhost:6379

### 重要文件位置
- 主配置: `docker-compose.yml`
- 开发配置: `docker-compose.dev.yml`
- 环境变量: `.env`
- 后端Dockerfile: `backend/Dockerfile`
- 前端Dockerfile: `frontend/Dockerfile`
- Nginx配置: `frontend/nginx.conf`

### 默认凭据
- PostgreSQL用户: `materials`
- PostgreSQL数据库: `materials_db`
- PostgreSQL密码: 在 `.env` 中设置

---

## 🎉 完成部署
按照本指南完成部署后，项目将以容器化方式运行，具备完整的服务隔离、数据持久化和健康检查功能。开发和生产环境配置分离，便于不同阶段的部署需求。

**总结**：生产环境修改代码需要重新构建，开发环境无需构建。按上述流程即可完成完整 Docker 部署。