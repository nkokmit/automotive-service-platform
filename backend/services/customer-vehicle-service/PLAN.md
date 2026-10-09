# PLAN.md --- Customer Vehicle Service

## 1. Mục tiêu

Triển khai `customer-vehicle-service` bằng Java Spring Boot để: - Quản
lý hồ sơ khách hàng và xe. - Mỗi xe có một chủ sở hữu hiện tại. - Lưu
lịch sử bảo dưỡng nhập từ bên ngoài và lịch sử nhận từ sự kiện Work
Order hoàn thành.

Trước khi code, đọc tài liệu thiết kế dự án và đối chiếu cấu trúc, code,
cấu hình của `user-service` cùng các service hiện có. Ưu tiên làm theo
convention thực tế của repository; không tự đoán những phần chưa được
xác định.

## 2. Schema

Database dự kiến: `customer_vehicle_service`.

### 2.1. Bảng `customers` --- Khách hàng

  -----------------------------------------------------------------------
  Trường            Kiểu              Bắt buộc          Ý nghĩa
  ----------------- ----------------- ----------------- -----------------
  `id`              `VARCHAR(36)`     Có                Mã định danh
                                                        khách hàng (UUID)

  `user_id`         `VARCHAR(36)`     Không             Mã tài khoản liên
                                                        kết trong
                                                        `user-service`;
                                                        không phải khóa
                                                        ngoại

  `full_name`       `VARCHAR(150)`    Có                Họ và tên khách
                                                        hàng

  `phone`           `VARCHAR(20)`     Có                Số điện thoại
                                                        liên hệ

  `email`           `VARCHAR(255)`    Không             Địa chỉ email

  `address`         `VARCHAR(500)`    Không             Địa chỉ khách
                                                        hàng

  `notes`           `TEXT`            Không             Ghi chú nội bộ

  `is_active`       `BOOLEAN`         Có                Khách hàng có
                                                        đang hoạt động
                                                        hay không; mặc
                                                        định `TRUE`

  `created_at`      `DATETIME(6)`     Có                Thời điểm tạo hồ
                                                        sơ

  `updated_at`      `DATETIME(6)`     Có                Thời điểm cập
                                                        nhật hồ sơ gần
                                                        nhất

  `deleted_at`      `DATETIME(6)`     Không             Thời điểm xóa
                                                        mềm; `NULL` nghĩa
                                                        là chưa xóa mềm
  -----------------------------------------------------------------------

Ràng buộc và index: - `id` là khóa chính. - `user_id` unique khi có giá
trị; cho phép nhiều khách hàng không liên kết tài khoản. - Index trên
`phone`, `email`, `deleted_at`. - Không đặt unique cho `phone` hoặc
`email`.

### 2.2. Bảng `vehicles` --- Xe

  -----------------------------------------------------------------------
  Trường            Kiểu              Bắt buộc          Ý nghĩa
  ----------------- ----------------- ----------------- -----------------
  `id`              `VARCHAR(36)`     Có                Mã định danh xe
                                                        (UUID)

  `customer_id`     `VARCHAR(36)`     Có                Mã khách hàng
                                                        đang sở hữu xe;
                                                        khóa ngoại đến
                                                        `customers.id`

  `license_plate`   `VARCHAR(20)`     Có                Biển số xe

  `vin`             `VARCHAR(17)`     Không             Mã VIN nhận diện
                                                        phương tiện

  `make`            `VARCHAR(100)`    Có                Hãng xe, ví dụ
                                                        Toyota

  `model`           `VARCHAR(100)`    Có                Dòng xe, ví dụ
                                                        Vios

  `model_year`      `SMALLINT`        Không             Năm sản xuất

  `trim`            `VARCHAR(100)`    Không             Phiên bản/cấu
                                                        hình xe

  `color`           `VARCHAR(50)`     Không             Màu sắc xe

  `fuel_type`       `VARCHAR(30)`     Không             Loại nhiên liệu

  `transmission`    `VARCHAR(30)`     Không             Loại hộp số

  `odometer_km`     `INT UNSIGNED`    Không             Số km gần nhất đã
                                                        ghi nhận; không
                                                        thay thế lịch sử
                                                        số km

  `notes`           `TEXT`            Không             Ghi chú về xe

  `is_active`       `BOOLEAN`         Có                Xe có đang hoạt
                                                        động trong hệ
                                                        thống hay không;
                                                        mặc định `TRUE`

  `created_at`      `DATETIME(6)`     Có                Thời điểm tạo hồ
                                                        sơ xe

  `updated_at`      `DATETIME(6)`     Có                Thời điểm cập
                                                        nhật hồ sơ xe gần
                                                        nhất

  `deleted_at`      `DATETIME(6)`     Không             Thời điểm xóa
                                                        mềm; `NULL` nghĩa
                                                        là chưa xóa mềm
  -----------------------------------------------------------------------

Ràng buộc và index: - `id` là khóa chính. - `customer_id` là khóa ngoại
nội bộ, `ON DELETE RESTRICT`. - `vin` unique khi có giá trị. - Index
trên `customer_id`, `license_plate`, `deleted_at`. - Không đặt unique
vĩnh viễn cho `license_plate`. - Mỗi xe chỉ có một chủ sở hữu hiện tại;
chưa triển khai đồng sở hữu hoặc lịch sử đổi chủ.

### 2.3. Bảng `vehicle_service_histories` --- Lịch sử bảo dưỡng

  -----------------------------------------------------------------------------
  Trường            Kiểu              Bắt buộc          Ý nghĩa
  ----------------- ----------------- ----------------- -----------------------
  `id`              `VARCHAR(36)`     Có                Mã định danh bản ghi
                                                        lịch sử (UUID)

  `vehicle_id`      `VARCHAR(36)`     Có                Mã xe được bảo dưỡng;
                                                        khóa ngoại đến
                                                        `vehicles.id`

  `work_order_id`   `VARCHAR(36)`     Không             Mã Work Order từ
                                                        `work-order-service`;
                                                        chỉ lưu ID tham chiếu

  `record_type`     `VARCHAR(30)`     Có                Nguồn/loại bản ghi lịch
                                                        sử

  `service_date`    `DATETIME(6)`     Có                Ngày thực hiện dịch vụ
                                                        hoặc ngày ghi nhận

  `odometer_km`     `INT UNSIGNED`    Không             Số km của xe tại thời
                                                        điểm dịch vụ

  `summary`         `VARCHAR(255)`    Có                Tóm tắt công việc bảo
                                                        dưỡng/sửa chữa

  `description`     `TEXT`            Không             Mô tả chi tiết bổ sung

  `garage_name`     `VARCHAR(150)`    Không             Tên gara thực hiện, đặc
                                                        biệt hữu ích với lịch
                                                        sử bên ngoài

  `created_at`      `DATETIME(6)`     Có                Thời điểm tạo bản ghi
                                                        lịch sử trong hệ thống
  -----------------------------------------------------------------------------

Giá trị hợp lệ của `record_type`: - `GARAGE_SERVICE`: dịch vụ được thực
hiện qua nền tảng. - `EXTERNAL_SERVICE`: dịch vụ thực hiện tại gara bên
ngoài. - `CUSTOMER_REPORTED`: thông tin do khách hàng cung cấp, chưa
được xác minh độc lập.

Ràng buộc và index: - `id` là khóa chính. - `vehicle_id` là khóa ngoại
nội bộ, `ON DELETE RESTRICT`. - `work_order_id` unique khi có giá trị để
ngăn ghi lịch sử trùng Work Order. - Index ghép
`(vehicle_id, service_date)` để truy vấn lịch sử của một xe theo thời
gian. - Không thêm soft delete cho lịch sử trong giai đoạn đầu.

## 3. Hướng triển khai

### Bước 1 --- Kiểm tra repository

-   Xác định cấu trúc module, package, Java/Spring Boot version, cách
    cấu hình DB, response format, exception, validation, security,
    Swagger và test.
-   Kiểm tra migration hiện có để quyết định dùng V1 hay version tiếp
    theo.
-   Báo cáo khác biệt quan trọng trước khi thay đổi cấu hình hoặc kiến
    trúc.

### Bước 2 --- Database và domain

-   Tạo Flyway migration cho ba bảng cùng PK, FK, unique constraint và
    index ở trên.
-   Tạo Entity, Repository và enum `record_type`.
-   Dùng quan hệ JPA chỉ cho `Vehicle -> Customer` và
    `VehicleServiceHistory -> Vehicle`; `user_id`, `work_order_id` là
    trường ID thông thường.
-   Cấu hình Hibernate `ddl-auto=validate`.

### Bước 3 --- Customer API

Triển khai DTO, validation, service và controller cho: - Tạo khách
hàng. - Lấy chi tiết khách hàng. - Danh sách/tìm kiếm khách hàng có phân
trang. - Cập nhật hồ sơ. - Xóa mềm khách hàng.

Không cho xóa mềm khách hàng nếu vẫn còn xe đang hoạt động; xử lý trong
transaction. Các truy vấn thông thường không trả khách hàng đã xóa mềm.

### Bước 4 --- Vehicle API

Triển khai: - Tạo xe cho khách hàng tồn tại và đang hoạt động. - Lấy chi
tiết xe. - Danh sách/tìm kiếm xe, lọc theo khách hàng hoặc biển số và
phân trang. - Cập nhật thông tin xe. - Đổi chủ hiện tại bằng cách cập
nhật `customer_id` sau khi xác minh khách hàng mới hợp lệ. - Xóa mềm xe.

Kiểm tra VIN trùng, dữ liệu bắt buộc, năm sản xuất hợp lệ và số km không
âm. Các truy vấn thông thường không trả xe đã xóa mềm.

### Bước 5 --- API lịch sử bảo dưỡng

-   Cho phép xem lịch sử theo xe, sắp xếp `service_date` giảm dần.
-   Cho phép nhân viên nhập lịch sử từ gara bên ngoài hoặc thông tin
    khách hàng cung cấp.
-   Không cho client tự tạo bản ghi lịch sử hệ thống bằng cách gửi
    `work_order_id` tùy ý.
-   Không lưu chi tiết hạng mục sửa chữa, phụ tùng, báo giá hoặc hóa đơn
    tại service này.

### Bước 6 --- Kafka consumer

Chỉ triển khai sau khi xác nhận topic, payload và convention Kafka thực
tế của dự án: - Nhận sự kiện Work Order hoàn thành. - Tạo
`vehicle_service_histories` với `record_type = GARAGE_SERVICE`. - Xác
minh xe tồn tại trong database cục bộ. - Dùng `work_order_id` để xử lý
idempotency, tránh tạo bản ghi trùng khi event được gửi lại. - Xác định
retry/dead-letter cho event lỗi hoặc xe chưa tồn tại. - Chỉ cập nhật
`vehicles.odometer_km` khi có quy tắc thời gian/số km rõ ràng để không
ghi đè số liệu mới bằng event cũ. - Nếu chưa có event contract hoặc hạ
tầng Kafka phù hợp, hoàn tất REST API trước và ghi nhận Kafka là phần
chờ tích hợp.

### Bước 7 --- Bảo mật và Swagger

-   Tái sử dụng cách xác thực JWT và kiểm tra permission đang dùng trong
    các service hiện có.
-   Xác định permission cụ thể từ code/tài liệu hiện hành, không tự đặt
    tên permission.
-   Cấu hình Swagger theo convention của dự án; chỉ thay đổi Gateway khi
    được yêu cầu hoặc thực sự cần thiết.

### Bước 8 --- Kiểm thử và bàn giao

Kiểm thử tối thiểu: - Tạo/cập nhật/tìm khách hàng; `user_id` trùng;
khách hàng không tồn tại. - Tạo xe với khách hàng hợp lệ/không hợp lệ;
VIN trùng; lọc và phân trang. - Không xóa khách hàng khi còn xe đang
hoạt động. - Bản ghi lịch sử bên ngoài; thứ tự lịch sử; Work Order bị
gửi event trùng. - Quyền truy cập các API. - Flyway chạy trên database
mới và Hibernate validate thành công.

Chạy test và build bằng lệnh phù hợp với repository. Báo cáo lệnh đã
chạy, kết quả thực tế, file thay đổi và phần còn chờ; không khẳng định
test thành công nếu chưa chạy.

## 4. Flyway migration

-   Nếu service chưa có migration, tạo
    `V1__create_customer_vehicle_tables.sql` trong
    `src/main/resources/db/migration/`.
-   Nếu V1 đã tồn tại hoặc đã được dùng/chia sẻ, không sửa V1; kiểm tra
    lịch sử và tạo migration kế tiếp.
-   SQL phải tương thích với phiên bản MySQL/Flyway thực tế.
-   Database ứng dụng phải được khởi tạo qua quy trình hiện có của dự
    án; không dựa vào Hibernate để tự tạo schema.

## 5. Tiêu chí hoàn thành

-   Ba bảng, ràng buộc và index được tạo qua Flyway.
-   Customer API và Vehicle API có DTO, validation, phân trang và xử lý
    lỗi thống nhất.
-   Soft delete không làm mất dữ liệu lịch sử; chính sách xóa khách hàng
    có xe được áp dụng.
-   API lịch sử hỗ trợ nhập ngoài và chống trùng Work Order.
-   Bảo mật và Swagger hoạt động theo convention hiện tại.
-   Test/build được chạy và kết quả được báo cáo chính xác.
-   Không tự ý sửa service khác hoặc thay đổi API
    contract/infrastructure ngoài phạm vi cần thiết.

## 6. Chỉ dẫn thực thi cho AI

Làm theo từng bước. Trước tiên kiểm tra repository và tóm tắt convention
liên quan; sau đó triển khai từng phần nhỏ, chạy test trước khi tiếp
tục. Không tạo toàn bộ service trong một thay đổi lớn. Khi thiếu thông
tin về cấu hình hoặc event contract, hãy dừng phần phụ thuộc vào thông
tin đó và nêu rõ điều cần xác nhận.
