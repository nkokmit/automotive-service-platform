# Contracts — API Specifications cho toàn hệ thống

> Folder này chứa **OpenAPI specs** (chuẩn OpenAPI 3.0.3) cho 5 microservice của đồ án.
>
> **Owner:** TV1 (Gateway owner)
>
> **Mục đích:** Thống nhất schema API giữa Frontend ↔ Gateway ↔ Backend ↔ AI trước khi code, tránh phải sửa lại sau khi đã tích hợp.

## Cấu trúc

```
contracts/
├── openapi.yaml          # Tổng hợp (dùng cho Gateway Swagger UI gộp)
├── auth-api.yaml         # TV2 phụ trách
├── commerce-api.yaml     # TV2 phụ trách
├── garage-api.yaml       # TV1 phụ trách (đã đầy đủ)
├── content-api.yaml      # TV1 phụ trách (đã đầy đủ)
└── ai-api.yaml           # TV3 phụ trách
```

## Quy ước chung

| Mục | Quy ước |
|---|---|
| Base URL (qua Gateway) | `http://localhost:4000/api/v1/...` |
| Auth | `Authorization: Bearer <jwt>` |
| JWT algorithm | RS256 (cặp key `jwt-private.pem` / `jwt-public.pem`) |
| JWT claims | `sub`, `email`, `role` (CUSTOMER \| GARAGE_STAFF \| ADMIN) |
| Định dạng tiền | Số nguyên VND (vd: `150000` = 150.000₫) |
| Định dạng datetime | ISO 8601 UTC (`2026-10-07T10:00:00Z`) |
| Phân trang | `?page=1&pageSize=20`, response: `{ items, page, pageSize, total }` |
| Slug | URL-safe (lowercase, dash), dùng cho SEO + URL đẹp |
| Error response | `{ code, message, details?, timestamp, path }` |
| Soft delete | Xoá = update `isActive=false` hoặc `status=ARCHIVED` |
| ID format | UUID v4 |
| Ngôn ngữ | Tiếng Việt (UI labels, error messages) |

## Hướng dẫn cho từng thành viên

### Thành viên 2 — phụ trách `auth-api.yaml` và `commerce-api.yaml`

**Bước 1**: Đọc skeleton TV1 đã viết (2 file YAML trên).

**Bước 2**: Review và **điền/sửa** cho khớp với ERD của bạn. Một số điểm TV1 đề xuất có thể cần thảo luận:

- `User.role` — TV1 đề xuất `CUSTOMER | GARAGE_STAFF | ADMIN`. Bạn có muốn thêm role khác không?
- `User.tier` — TV1 đề xuất `MEMBER | SILVER | GOLD | PLATINUM` (dựa trên UI mockup). Có khớp với thiết kế của bạn không?
- `Vehicle.isDefault` — nên có không? (Frontend muốn có)
- `Order.paymentMethod` — TV1 đề xuất `COD | BANKING | MOMO | VNPAY`. Bạn đã chốt chưa?
- Bảng giờ `OrderStatus` — TV1 dùng `PENDING | CONFIRMED | SHIPPING | DELIVERED | CANCELLED | REFUNDED`. Còn không?

**Bước 3**: Thêm field mới (nếu cần), nhưng **giữ tên field cũ** nếu có thể.

**Bước 4**: Commit lại 2 file này với message rõ ràng:

```
contracts(auth): update auth-api.yaml with custom role and vehicle schema

- Add role GARAGE_OWNER (separate from GARAGE_STAFF)
- Add Vehicle.lastServiceDate
- Confirm tier values: MEMBER | SILVER | GOLD | PLATINUM
```

### Thành viên 3 — phụ trách `ai-api.yaml`

**Bước 1**: Đọc skeleton TV1 đã viết (`ai-api.yaml`).

**Bước 2**: Đặc biệt chú ý `DamageDetectionResult.damages[]` và `RecommendResult.items[]` — TV1 dựa trên UI mockup của Frontend. Nếu model AI của bạn trả output khác (vd: trả raw tensor thay vì tên part tiếng Việt), cần thêm wrapper để chuẩn hoá.

**Bước 3**: Thảo luận endpoint `/ai/assistant/booking-suggestion` — TV1 đề xuất AI Agent tra cứu qua gateway tới garage-service. Bạn có muốn AI Agent gọi trực tiếp garage-service không (bypass Gateway)? TV1 khuyến nghị đi qua Gateway để dễ monitor/audit.

**Bước 4**: Commit lại file `ai-api.yaml` với note rõ ràng về model AI thật của bạn (vd: dùng YOLOv8, GPT-4, hay custom model).

### Thành viên 1 (bạn) — đã xong

2 file `garage-api.yaml` và `content-api.yaml` đã đầy đủ. Khi code Backend tương ứng, nếu phát hiện field cần thêm/sửa, cập nhật YAML ngay trong cùng commit với code Java.

## Cách dùng OpenAPI

### 1. Validate cú pháp (cả nhóm)

Mở file YAML trong [Swagger Editor online](https://editor.swagger.io/) — paste nội dung file vào → editor sẽ báo lỗi cú pháp nếu có.

### 2. Generate TypeScript types cho Frontend (TV1)

```bash
cd frontend
npm install --save-dev openapi-typescript
npx openapi-typescript ../contracts/openapi.yaml -o src/types/api.d.ts
```

### 3. Generate Java DTO cho Backend (tất cả TV)

Trong `pom.xml` của từng service, thêm plugin:

```xml
<plugin>
    <groupId>org.openapitools</groupId>
    <artifactId>openapi-generator-maven-plugin</artifactId>
    <version>7.5.0</version>
    <executions>
        <execution>
            <goals>
                <goal>generate</goal>
            </goals>
            <configuration>
                <inputSpec>${project.basedir}/../contracts/auth-api.yaml</inputSpec>
                <generatorName>spring-boot</generatorName>
                <outputDirectory>${project.build.directory}/generated-sources</outputDirectory>
                <apiPackage>com.autocare.userservice.api</apiPackage>
                <modelPackage>com.autocare.userservice.dto</modelPackage>
                <configOptions>
                    <interfaceOnly>true</interfaceOnly>
                    <useTags>true</useTags>
                </configOptions>
        </configuration>
        </execution>
    </executions>
</plugin>
```

### 4. Test API qua Postman

Import file YAML: Postman → Import → chọn file → Postman tự generate request examples.

## Khi có conflict giữa các file

**Workflow đề xuất:**

1. Thành viên phát hiện conflict tạo Issue trên GitHub
2. Cả 3 thảo luận trong issue
3. Người owner file conflict quyết định cuối cùng
4. Người owner commit update → tag để báo TV khác biết
5. TV khác cập nhật code theo (nếu đã code rồi)

**Ví dụ**: TV2 muốn `User.role` thêm giá trị `GARAGE_OWNER`
- TV2 tạo issue: "Conflict: User.role cần thêm GARAGE_OWNER"
- TV1, TV3 review: TV1 OK (Frontend cần), TV3 OK
- TV1 sửa `auth-api.yaml` → commit với tag "CONTRACT_UPDATE"
- TV2 update code Java user-service theo file mới

## Lưu ý quan trọng

1. **KHÔNG tự ý sửa file của người khác** — nếu cần sửa, tạo PR và tag người đó review.
2. **Mọi thay đổi schema → cập nhật YAML NGAY** trong cùng commit với code.
3. **Dùng additive changes khi có thể** — thêm field mới thì OK; đổi tên field sẽ break Frontend.
4. **Đặt tên field phải snake_case trong JSON**, camelCase trong Java, snake_case trong DB.
5. **Mỗi schema phải có mô tả** — TV khác đọc mới hiểu context.

## Liên hệ

- **TV1 (Gateway + Garage + Content + Frontend)**: [Tên bạn]
- **TV2 (User/Auth + Commerce)**: [Tên TV2]
- **TV3 (AI services)**: [Tên TV3]

Channel chính: [Slack/Discord/Zalo group link]