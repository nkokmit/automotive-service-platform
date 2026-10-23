# Automotive Service Platform — API Gateway

> **Thành viên phụ trách:** TV1 (đồ án sinh viên)
> **Stack:** Spring Cloud Gateway (WebFlux reactive) + Spring Security + SpringDoc
> **Java:** 17+ (target compatibility)

API Gateway là **điểm truy cập duy nhất** cho Frontend. Mọi request từ React app đều đi qua Gateway ở port 4000, được xử lý CORS / JWT / logging / tracing, sau đó route đến microservice tương ứng.

```
Frontend  ──HTTP──►  Gateway (:4000)  ──HTTP──►  user-service    (:8081)
                                                  garage-service  (:8082)
                                                  commerce-service(:8083)
                                                  content-service (:8084)
                                                  ai-services     (:9001/9002/9003)
```

## Mục lục

- [Yêu cầu](#yêu-cầu)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cách chạy](#cách-chạy)
- [Cấu hình](#cấu-hình)
- [Routing](#routing)
- [Bảo mật](#bảo-mật)
- [Logging](#logging)
- [Swagger UI](#swagger-ui)
- [Docker](#docker)

## Yêu cầu

| Tool | Version |
|---|---|
| JDK | 17 hoặc 21 |
| Maven | 3.9+ |
| Docker (optional) | 20+ |

## Cấu trúc thư mục

```
gateway/
├── pom.xml                                   # Maven project
├── Dockerfile                                # Docker image build
├── README.md
└── src/main/
    ├── java/com/autocare/gateway/
    │   ├── GatewayApplication.java          # @SpringBootApplication entrypoint
    │   ├── config/
    │   │   ├── RouteConfig.java             # ⭐ Single source of truth cho routing
    │   │   └── SwaggerConfig.java           # OpenAPI UI config
    │   ├── security/
    │   │   └── JwtConfig.java               # JWT verify + Security filter chain
    │   ├── filter/
    │   │   └── GlobalRequestFilter.java     # RequestId + UserHeader + Logging
    │   └── health/
    │       └── HealthController.java        # GET /healthz
    └── resources/
        ├── application.yml                  # Default config
        ├── application-dev.yml              # DEV profile (NO JWT)
        └── application-prod.yml             # PROD profile (JWT auth)
```

## Cách chạy

### Cách 1: Maven (dev — chưa cần user-service)

```bash
cd gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Gateway sẽ chạy ở `http://localhost:4000`. Ở profile `dev`, JWT bị tắt → mọi request public.

### Cách 2: Maven (prod — cần JWT)

```bash
# 1. Tạo cặp key RS256 cho JWT
openssl genrsa -out src/main/resources/jwt-private.pem 2048
openssl rsa -in src/main/resources/jwt-private.pem -pubout -out src/main/resources/jwt-public.pem

# 2. Chạy
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

Trong production, public key nên mount qua Kubernetes Secret hoặc lấy từ JWKS endpoint.

### Cách 3: Docker

```bash
docker build -t automotive-gateway:0.1.0 .
docker run --rm -p 4000:4000 -e SPRING_PROFILES_ACTIVE=dev automotive-gateway:0.1.0
```

## Cấu hình

Mọi cấu hình routing (URL upstream) đều qua **environment variable**, không cần sửa code:

| ENV var | Default | Mô tả |
|---|---|---|
| `USER_SVC_URL` | `http://localhost:8081` | user-service |
| `GARAGE_SVC_URL` | `http://localhost:8082` | garage-service |
| `COMMERCE_SVC_URL` | `http://localhost:8083` | commerce-service |
| `CONTENT_SVC_URL` | `http://localhost:8084` | content-service |
| `AI_DAMAGE_URL` | `http://localhost:9001` | damage-detection-service |
| `AI_RECOMMEND_URL` | `http://localhost:9002` | recommendation-service |
| `AI_AGENT_URL` | `http://localhost:9003` | agent-service |
| `JWT_PUBLIC_KEY_LOCATION` | `classpath:jwt-public.pem` | Public key cho JWT verify |
| `SPRING_PROFILES_ACTIVE` | (none) | `dev` / `prod` |

## Routing

Xem chi tiết tại [`RouteConfig.java`](src/main/java/com/autocare/gateway/config/RouteConfig.java).

| Path prefix | Upstream | Strip prefix |
|---|---|---|
| `/api/v1/auth/**` | `USER_SVC_URL` | `/api/v1` |
| `/api/v1/users/**` | `USER_SVC_URL` | `/api/v1` |
| `/api/v1/services/**` | `GARAGE_SVC_URL` | `/api/v1` |
| `/api/v1/garages/**` | `GARAGE_SVC_URL` | `/api/v1` |
| `/api/v1/cars/**` | `GARAGE_SVC_URL` | `/api/v1` |
| `/api/v1/bookings/**` | `GARAGE_SVC_URL` | `/api/v1` |
| `/api/v1/timeslots/**` | `GARAGE_SVC_URL` | `/api/v1` |
| `/api/v1/parts/**` | `COMMERCE_SVC_URL` | `/api/v1` |
| `/api/v1/cart/**` | `COMMERCE_SVC_URL` | `/api/v1` |
| `/api/v1/orders/**` | `COMMERCE_SVC_URL` | `/api/v1` |
| `/api/v1/news/**`, `/api/v1/articles/**` | `CONTENT_SVC_URL` | `/api/v1` |
| `/api/v1/categories/**` | `CONTENT_SVC_URL` | `/api/v1` |
| `/api/v1/ai/damage/**` | `AI_DAMAGE_URL` | `/api/v1/ai/damage` |
| `/api/v1/ai/recommend/**` | `AI_RECOMMEND_URL` | `/api/v1/ai/recommend` |
| `/api/v1/ai/assistant/**` | `AI_AGENT_URL` | `/api/v1/ai/assistant` |

**Ví dụ:**

- Frontend gọi `GET http://localhost:4000/api/v1/services?category=REPAIR`
- Gateway strip `/api/v1` → forward `GET http://localhost:8082/services?category=REPAIR`
- garage-service trả về JSON → Gateway forward response về Frontend

## Bảo mật

### DEV mode (mặc định lúc đầu)

Khi chưa có user-service, JWT public key chưa tồn tại. Đặt `SPRING_PROFILES_ACTIVE=dev` để tắt JWT verify.

⚠️ **KHÔNG BAO GIỜ dùng dev mode ở production.**

### PROD mode

JWT verify bằng **RS256 public key** (file PEM). Token được ký bởi user-service.

Token payload format (JWT claims):

```json
{
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "CUSTOMER | GARAGE_STAFF | ADMIN",
  "iat": 1696665600,
  "exp": 1696666500
}
```

**Global filter `GlobalRequestFilter` sẽ chèn 3 header vào request forwarded đến service:**

- `X-User-Id`: UUID của user
- `X-User-Email`: email
- `X-User-Role`: CUSTOMER / GARAGE_STAFF / ADMIN

Service backend **tin tưởng các header này** (mạng internal), không cần verify JWT lại.

### CORS

Cấu hình trong [`application.yml`](src/main/resources/application.yml). Mặc định whitelist:

- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (React dev)
- `https://demo.autocare.vn`
- `https://autocare.vn`

## Logging

Mỗi request được log format:

```
[REQ-UUID] METHOD /api/v1/path → STATUS (DURATION_MS ms)
```

Ví dụ:

```
[a1b2c3d4-...] GET /api/v1/services?category=REPAIR → 200 (45ms)
[e5f-zoe-...] POST /api/v1/bookings → 201 (123ms)
```

Mỗi response cũng có header `X-Request-Id` để client có thể gửi kèm khi báo lỗi.

## Swagger UI

### Swagger UI của chính Gateway

```
http://localhost:4000/swagger-ui.html
```

Chỉ hiển thị `/healthz` (Gateway bản thân không có API nghiệp vụ).

### Swagger UI của từng microservice (qua Gateway proxy)

Giả sử mỗi service backend bật `springdoc-openapi` ở path `/swagger-ui.html`:

```
http://localhost:4000/docs/auth/swagger-ui.html       → user-service
http://localhost:4000/docs/users/swagger-ui.html      → user-service
http://localhost:4000/docs/garage/swagger-ui.html    → garage-service
http://localhost:4000/docs/services/swagger-ui.html  → garage-service
http://localhost:4000/docs/commerce/swagger-ui.html  → commerce-service
http://localhost:4000/docs/parts/swagger-ui.html     → commerce-service
http://localhost:4000/docs/content/swagger-ui.html   → content-service
http://localhost:4000/docs/news/swagger-ui.html      → content-service
```

## Docker

### Build & run standalone

```bash
docker build -t automotive-gateway:0.1.0 gateway/
docker run --rm -p 4000:4000 \
    -e USER_SVC_URL=http://user-service:8081 \
    -e GARAGE_SVC_URL=http://garage-service:8082 \
    -e SPRING_PROFILES_ACTIVE=dev \
    automotive-gateway:0.1.0
```

### Trong docker-compose toàn hệ thống

Xem `docker-compose.yml` ở root project — Gateway sẽ chạy trước, các service khác `depends_on: gateway`.

## Endpoints test nhanh

```bash
# Healthcheck
curl http://localhost:4000/healthz

# Forward tới garage-service (cần service backend chạy)
curl http://localhost:4000/api/v1/services

# Forward với JWT (cần service backend chạy)
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/users/me
```

## License

MIT — Đồ án tốt nghiệp.