# 07 — Docker 容器化与部署

## 目标
将前后端容器化，使用 Docker Compose 一键启动完整环境。

---

## 1. 后端 Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 先复制依赖文件（利用 Docker 缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 非 root 用户运行
RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**关键点**:
- 使用 `python:3.11-slim` 而不是 `python:3.11`，减少镜像体积
- 先 COPY `requirements.txt` 再 COPY 代码，利用 Docker layer cache
- 生产环境用 `--workers 4`（根据 CPU 核数调整）
- 不要在生产环境使用 `--reload`

## 2. 前端 Dockerfile (`frontend/Dockerfile`)

多阶段构建：构建 + Nginx 服务

```dockerfile
# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== 生产阶段 =====
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 配置（SPA 路由 + API 代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 3. Nginx 配置 (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA 路由 — 所有非文件请求都返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（导出端点可能耗时较长）
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}
```

## 4. Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  # ===== PostgreSQL（如果本地没有运行的话） =====
  # 如果已有 PostgreSQL 实例，注释掉此 service，直接配置 DATABASE_URL
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-materials}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-materials_pass}
      POSTGRES_DB: ${DB_NAME:-materials_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # 如果需要初始化数据，挂载 SQL 文件
      # - ./data/ALL_INFO.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-materials}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== Redis 缓存（可选） =====
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== 后端 =====
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER:-materials}:${DB_PASSWORD:-materials_pass}@db:5432/${DB_NAME:-materials_db}
      REDIS_URL: redis://redis:6379/0
      CORS_ORIGINS: '["http://localhost", "http://localhost:80"]'
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # ===== 前端 =====
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

## 5. 环境变量 (`.env`)

```env
# 数据库
DB_USER=materials
DB_PASSWORD=your_secure_password_here
DB_NAME=materials_db

# 如果使用外部数据库，直接配置完整 URL
# DATABASE_URL=postgresql+asyncpg://user:pass@external-host:5432/materials_db
```

## 6. 启动命令

```bash
# 首次启动（构建镜像）
docker-compose up --build -d

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 停止
docker-compose down

# 停止并删除数据卷（清除数据库数据）
docker-compose down -v
```

## 7. 开发模式 (`docker-compose.dev.yml`)

开发时可以用 override 文件挂载代码目录实现热重载：

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "5173:5173"
```

```bash
# 开发模式启动
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## 8. 健康检查端点

后端添加健康检查端点供 Docker 和负载均衡器使用：

```python
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": str(e)}
        )
```

---

## 验收标准

- [ ] `docker-compose up --build` 一键启动成功
- [ ] 前端 http://localhost 可访问
- [ ] 后端 http://localhost:8000/docs 可访问
- [ ] API 代理正常（前端请求 /api/v1/materials 到达后端）
- [ ] 数据库连接正常
- [ ] 停止后重启数据不丢失

## 常见错误提醒

1. Docker Compose 中 service 之间用 service name 通信（如 `db:5432`），不是 `localhost`
2. 前端构建时 `VITE_API_BASE_URL` 不要写 `localhost`，因为是 Nginx 代理
3. PostgreSQL 健康检查要用 `pg_isready`，不要用 `curl`
4. 后端 `depends_on` 必须搭配 `condition: service_healthy`，否则可能在数据库就绪前启动
5. Nginx `try_files` 是 SPA 路由的关键，少了它刷新页面会 404
