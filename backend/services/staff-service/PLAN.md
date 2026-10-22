# PLAN.md --- Staff Service

## 1. Mục tiêu và phạm vi

Staff Service quản lý hồ sơ nhân viên garage và lịch làm việc để các
service khác có thể tra cứu nhân sự theo thời gian.

Phạm vi triển khai: - Quản lý hồ sơ nhân viên và trạng thái hoạt động. -
Quản lý các ca làm việc chuẩn của garage. - Thiết lập lịch làm việc định
kỳ theo thứ trong tuần. - Quản lý ngày nghỉ do quản lý trực tiếp ghi
nhận. - Quản lý ngoại lệ lịch theo ngày cụ thể khi lịch định kỳ không
phản ánh đúng thực tế. - Cung cấp API tra cứu lịch và khoảng thời gian
nhân viên có thể làm việc, phục vụ Booking Service.

Không triển khai trong service này: - Đăng nhập, mật khẩu, role hoặc
permission của tài khoản; User Service là nguồn dữ liệu tài khoản. - Quy
trình nhân viên gửi đơn nghỉ và chờ phê duyệt. Quản lý trực tiếp ghi
nhận ngày nghỉ. - Quản lý kỹ năng/chuyên môn của thợ máy. - Quản lý
booking, giữ chỗ, phân công sửa chữa hoặc trạng thái Work Order. - Tính
lương, chấm công, phòng ban hay các chức năng HR tổng quát.

## 2. Bối cảnh tích hợp

-   Staff Service sở hữu dữ liệu hồ sơ nhân viên, ca làm, lịch định kỳ,
    ngày nghỉ và ngoại lệ lịch.
-   `user_id` là tham chiếu logic đến User Service. Không tạo khóa ngoại
    xuyên service và không sao chép chức năng xác thực tài khoản.
-   Booking Service gọi API của Staff Service để tra cứu lịch làm
    việc/khả năng làm việc trong khoảng thời gian yêu cầu. Booking
    Service vẫn sở hữu dữ liệu và trạng thái booking của nó.
-   Staff Service không truy cập database của Booking Service hoặc Work
    Order Service.
-   API availability của Staff Service chỉ phản ánh lịch và tình trạng
    nhân viên theo dữ liệu Staff Service. Nó không tự biết nhân viên đã
    bị booking giữ chỗ hay đã được phân công vào Work Order. Việc kết
    hợp với booking/công việc đang tồn tại thuộc service điều phối tương
    ứng.
-   Khi cần liên kết nhân viên với Work Order, dùng `staffId` như định
    danh tham chiếu qua API/event contract; không tạo FK sang database
    của service khác.

## 3. Thiết kế dữ liệu đề xuất

Dùng UUID dạng chuỗi (`VARCHAR(36)`) cho ID theo quy ước của service.
Tên bảng/cột có thể điều chỉnh theo convention hiện có của repository,
nhưng giữ nguyên ý nghĩa và quan hệ dữ liệu dưới đây.

### 3.1 `staff_members`

Hồ sơ nhân viên.

Các trường chính: - `id` - `user_id` nullable: ID tài khoản trong User
Service; nullable để hỗ trợ nhân viên chưa có tài khoản. -
`employee_code`: mã nhân viên, duy nhất. - `full_name` - `phone`
nullable - `email` nullable - `position`: chức danh/vị trí vận hành,
không phải hệ thống kỹ năng. - `is_active`: hồ sơ còn hoạt động nghiệp
vụ hay không; mặc định `TRUE`. - `created_at`, `updated_at` -
`deleted_at` nullable: thời điểm xóa mềm.

`is_active` khác `deleted_at`: nhân viên `is_active = FALSE` vẫn là hồ
sơ hợp lệ, được xem trong danh sách thông thường và có thể được kích hoạt
lại; nhân viên có `deleted_at IS NOT NULL` đã bị xóa mềm và bị loại khỏi
các truy vấn nghiệp vụ thông thường. Chuyển nhân viên nghỉ việc/tạm
ngừng sang `is_active = FALSE`; chỉ dùng xóa mềm để loại hồ sơ tạo nhầm,
trùng lặp hoặc không còn được quản lý như một hồ sơ hợp lệ. Không cho
tạo/cập nhật lịch mới cho nhân viên không hoạt động hoặc đã xóa mềm;
các bản ghi lịch và lịch sử hiện có không bị xóa theo hồ sơ.

Đề xuất ràng buộc: - Unique `employee_code`. - Unique `user_id` khi khác
`NULL` nếu một tài khoản chỉ liên kết với tối đa một hồ sơ nhân viên. -
Không tạo FK tới bảng `users` của User Service.

### 3.2 `work_shifts`

Danh mục các ca chuẩn, ví dụ ca sáng và ca chiều.

Các trường chính: - `id` - `code`: mã ca duy nhất. - `name` -
`start_time` - `end_time` - `is_active`: ca còn được phép dùng để thiết
lập lịch mới hay không; mặc định `TRUE`. - `created_at`, `updated_at` -
`deleted_at` nullable: thời điểm xóa mềm.

Ca `is_active = FALSE` vẫn hiển thị trong danh sách thông thường và vẫn
có thể được đọc để diễn giải lịch đã cấu hình; không cho chọn ca này khi
tạo/cập nhật lịch mới. Ca có `deleted_at IS NOT NULL` bị loại khỏi truy
vấn thông thường. Chỉ cho xóa mềm ca chưa từng được tham chiếu bởi lịch;
nếu đã được dùng, chuyển `is_active = FALSE` để giữ nguyên khả năng đọc
và diễn giải lịch cũ.

Với cả hai bảng, xóa mềm không đồng nghĩa với xóa vật lý: `DELETE` đặt
`deleted_at`, không xóa dòng hay giải phóng các giá trị unique. Truy vấn
thông thường loại bản ghi đã xóa mềm (theo pattern `@SQLRestriction`
nếu tương thích với phiên bản Hibernate); các truy vấn lịch sử cần đọc
bản ghi liên quan phải chủ động dùng đường truy vấn không áp dụng bộ lọc
này (ví dụ native query hoặc mapping riêng, vì `@SQLRestriction` không
thể được tắt cho từng truy vấn). MVP không cung cấp xóa vật lý.

Thiết kế MVP giả định một ca bắt đầu và kết thúc trong cùng ngày. Nếu
sau này cần ca qua đêm, phải xác định rõ cách biểu diễn và tính khoảng
thời gian trước khi hỗ trợ.

### 3.3 `staff_recurring_schedules`

Một bản ghi biểu diễn **một nhân viên + một ca + một thứ trong tuần +
một khoảng hiệu lực**. Nhân viên làm cả ca sáng và chiều vào cùng một
thứ sẽ có hai bản ghi; API cho phép quản lý gửi nhiều ca/ngày trong một
lần thiết lập.

Các trường chính: - `id` - `staff_id` - `shift_id` - `day_of_week`: số
nguyên từ `1` đến `7` (`1 = Monday`, `7 = Sunday`). - `effective_from` -
`effective_to` nullable: `NULL` nghĩa là chưa xác định ngày kết thúc. -
`created_at`, `updated_at`

Ràng buộc và kiểm tra: - `day_of_week` nằm trong khoảng 1--7; dùng
`CHECK` nếu phiên bản MySQL đang dùng hỗ trợ phù hợp. - Tạo index phục
vụ truy vấn theo `staff_id`, `day_of_week` và khoảng hiệu lực. - Chặn
bản ghi trùng chính xác. - Ở tầng service, kiểm tra các khoảng hiệu lực
của cùng nhân viên/ca/thứ không chồng lấn. Unique key đơn thuần không
thể ngăn mọi trường hợp chồng lấn khoảng ngày.

### 3.4 `staff_absences`

Lưu các khoảng thời gian nhân viên nghỉ do quản lý ghi nhận trực tiếp.

Các trường chính: - `id` - `staff_id` - `start_at` - `end_at` -
`absence_type`: loại nghỉ phù hợp với phạm vi vận hành của garage. -
`reason` nullable - `recorded_by`: ID tài khoản quản lý ghi nhận, nếu có
thể xác định từ thông tin xác thực. - `created_at`

Không cần trạng thái `PENDING`/`REJECTED` vì không có quy trình nhân
viên gửi đơn. Nếu cần hủy bản ghi nghỉ nhưng vẫn giữ dấu vết, bổ sung
trường hủy/audit theo yêu cầu; không tự thêm workflow phê duyệt.

### 3.5 `staff_schedule_exceptions`

Dùng cho thay đổi lịch một lần ở một ngày cụ thể, chẳng hạn hủy một ca
theo lịch định kỳ hoặc thêm ca ngoài lịch định kỳ.

Thiết kế cần thể hiện rõ loại ngoại lệ, ví dụ: - `CANCEL_SHIFT`: hủy ca
định kỳ của nhân viên trong ngày cụ thể. - `ADD_SHIFT`: thêm ca ngoài
lịch định kỳ trong ngày cụ thể.

Các trường chính đề xuất: - `id` - `staff_id` - `shift_id` -
`exception_date` - `exception_type` - `reason` nullable - `created_by` -
`created_at`, `updated_at`

Không triển khai ngoại lệ như một bảng "ghi chú" mơ hồ. Khi code, xác
định rõ ngoại lệ nào ghi đè lịch định kỳ và ngoại lệ nào bổ sung lịch.
Nếu cần thay đổi giờ bắt đầu/kết thúc so với ca chuẩn, mở rộng schema
một cách tường minh bằng giờ override; không ngầm hiểu rằng ngoại lệ có
thể sửa giờ ca.

## 4. Cách tính lịch làm việc

Tạo một service/domain component chuyên tổng hợp lịch, không rải logic
này trong controller.

Với mỗi nhân viên và ngày được truy vấn: 1. Chỉ xét nhân viên có
`is_active = TRUE` và chưa bị xóa mềm. 2. Tìm lịch định kỳ có hiệu lực
trong ngày đó và khớp `day_of_week`. 3. Áp dụng ngoại lệ theo ngày: hủy
ca định kỳ hoặc thêm ca bổ sung. 4. Loại bỏ hoặc trừ các khoảng thời
gian bị `staff_absences` giao nhau. 5. Trả về các khoảng làm việc cuối
cùng.

Quy ước cần giữ nhất quán: - Khoảng thời gian được biểu diễn theo
ISO-8601 và có múi giờ rõ ràng ở API. Chốt một quy ước timezone cho
garage khi triển khai. - Khoảng thời gian dùng quy ước nửa mở
`[startAt, endAt)` để xử lý chính xác các khoảng liền kề. - Một nhân
viên có thể có nhiều khoảng làm việc trong một ngày. - Không trả nhân
viên `is_active = FALSE` hoặc đã xóa mềm như người có thể làm việc. -
Kiểm tra dữ liệu đầu vào để `startAt < endAt`; tránh khoảng nghỉ hoặc
lịch có thời lượng không hợp lệ. - Nếu lịch định kỳ, ngoại lệ và nghỉ
phép mâu thuẫn, áp dụng thứ tự ở trên và viết test cho từng tình huống.

## 5. API dự kiến

Đặt tiền tố `/api`. Tên endpoint có thể khớp convention hiện tại của
project.

### 5.1 Hồ sơ nhân viên

-   `POST /api/staff` --- tạo hồ sơ.
-   `GET /api/staff` --- danh sách có phân trang và bộ lọc phù hợp.
-   `GET /api/staff/{staffId}` --- xem chi tiết.
-   `PUT /api/staff/{staffId}` --- cập nhật thông tin hồ sơ.
-   `PATCH /api/staff/{staffId}/is-active` --- đổi `isActive`.
-   `DELETE /api/staff/{staffId}` --- xóa mềm bằng cách đặt `deletedAt`;
    không dùng endpoint này cho nghiệp vụ nghỉ việc/tạm ngừng.
-   Các truy vấn danh sách mặc định loại hồ sơ đã xóa mềm; hỗ trợ filter
    `isActive` tùy chọn, trong đó không truyền filter vẫn bao gồm cả hồ
    sơ đang và không hoạt động.

### 5.2 Ca làm việc

-   `POST /api/work-shifts` --- tạo ca.
-   `GET /api/work-shifts` --- danh sách ca.
-   `GET /api/work-shifts/{shiftId}` --- chi tiết ca.
-   `PUT /api/work-shifts/{shiftId}` --- cập nhật ca.
-   `PATCH /api/work-shifts/{shiftId}/is-active` --- đổi `isActive`.
-   `DELETE /api/work-shifts/{shiftId}` --- xóa mềm; chỉ cho phép nếu ca
    chưa từng được lịch định kỳ hoặc ngoại lệ tham chiếu.
-   Nếu ca đã được dùng trong lịch, chuyển `isActive = FALSE` thay vì
    xóa mềm; lịch cũ vẫn phải đọc và diễn giải được. Danh sách ca mặc
    định loại ca đã xóa mềm, nhưng bao gồm ca không hoạt động trừ khi có
    filter `isActive`.

### 5.3 Lịch định kỳ

-   `PUT /api/staff/{staffId}/recurring-schedules` --- thiết lập/thay
    thế lịch định kỳ hàng loạt trong một request.
-   `GET /api/staff/{staffId}/recurring-schedules` --- xem lịch định kỳ
    đã cấu hình.
-   `GET /api/staff/{staffId}/schedules?from=...&to=...` --- xem lịch đã
    tổng hợp theo ngày trong khoảng thời gian.
-   `GET /api/schedules?from=...&to=...` --- xem lịch tổng hợp của toàn
    garage nếu cần cho màn hình quản lý.

Ví dụ request cho endpoint thiết lập lịch hàng loạt:

``` json
{
  "effectiveFrom": "2026-11-01",
  "effectiveTo": null,
  "weeklySchedules": [
    {
      "dayOfWeek": "MONDAY",
      "shiftIds": ["SHIFT_MORNING", "SHIFT_AFTERNOON"]
    },
    {
      "dayOfWeek": "TUESDAY",
      "shiftIds": ["SHIFT_MORNING", "SHIFT_AFTERNOON"]
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "shiftIds": ["SHIFT_MORNING", "SHIFT_AFTERNOON"]
    },
    {
      "dayOfWeek": "THURSDAY",
      "shiftIds": ["SHIFT_MORNING", "SHIFT_AFTERNOON"]
    },
    {
      "dayOfWeek": "FRIDAY",
      "shiftIds": ["SHIFT_MORNING", "SHIFT_AFTERNOON"]
    }
  ]
}
```

Backend chuyển request thành các bản ghi chuẩn hóa trong
`staff_recurring_schedules`. Cần quy định rõ `PUT` là thay thế toàn bộ
lịch trong khoảng hiệu lực được chỉ định hay chỉ cập nhật các ngày được
gửi; không để semantics mơ hồ. Khuyến nghị thay thế lịch cho đúng khoảng
hiệu lực được chỉ định trong một transaction, sau khi kiểm tra xung đột.

### 5.4 Nghỉ phép và ngoại lệ

-   `POST /api/staff/{staffId}/absences` --- quản lý ghi nhận khoảng
    nghỉ.
-   `PUT /api/staff/{staffId}/absences` --- quản lý sửa khoảng
      nghỉ.
-   `DELETE /api/staff/{staffId}/absences/{absenceId}` --- xóa khoảng
    nghỉ.
-   `GET /api/staff/{staffId}/absences?from=...&to=...` --- tra cứu
    khoảng nghỉ.


-   `POST /api/staff/{staffId}/schedule-exceptions` --- thêm ngoại lệ
    lịch.
-   `PUT /api/staff/{staffId}/schedule-exceptions/{exceptionId}` --- sửa ngoại lệ
    lịch.
-   `DELETE /api/staff/{staffId}/schedule-exceptions/{exceptionId}` --- xóa ngoại lệ
    lịch.
-   `GET /api/staff/{staffId}/schedule-exceptions?from=...&to=...` ---
    tra cứu ngoại lệ.

### 5.5 Tra cứu khả năng làm việc

-   `GET /api/staff/availability?startAt=...&endAt=...` --- trả về nhân
    viên `isActive = TRUE`, chưa bị xóa mềm và có lịch làm việc bao phủ
    khoảng thời gian yêu cầu, sau khi xét ngoại lệ và nghỉ phép.

Hợp đồng availability cần thống nhất với Booking Service: khoảng thời
gian truy vấn, timezone, định dạng response và ý nghĩa "available".
Không tuyên bố rằng API này bảo đảm nhân viên chưa được booking hoặc
Work Order khác sử dụng.

## 6. Thứ tự triển khai

### Giai đoạn 1 --- Khảo sát repository

-   Đọc cấu trúc service hiện tại, dependency, package convention, cách
    cấu hình MySQL/Flyway, response/error format, validation và bảo mật
    đang dùng.
-   Đọc `GLOBAL_RULES.md` và `WORK_FOLLOW.md` để tuân thủ các quy ước
    chung; không sao chép các quy tắc đó vào tài liệu này.
-   Kiểm tra phiên bản MySQL và cách xử lý ngày giờ đang dùng trước khi
    chốt migration.

### Giai đoạn 2 --- Khởi tạo service và migration

-   Tạo cấu hình service, health check và kết nối database theo
    convention hiện có.
-   Tạo Flyway migration ban đầu cho `staff_members`, `work_shifts`,
    `staff_recurring_schedules`, `staff_absences`,
    `staff_schedule_exceptions`.
-   Thêm index, unique/check constraints khả thi và seed dữ liệu ca mẫu
    nếu project cần.
-   Không nhúng dữ liệu môi trường/secret vào cấu hình được commit.

### Giai đoạn 3 --- Hồ sơ nhân viên và ca làm

-   Implement entity/model, repository, DTO, mapper, service và
    controller cho `staff_members`.
-   Implement CRUD cần thiết cho `work_shifts`.
-   Thêm validation, xử lý ID không tồn tại, mã nhân viên trùng,
    `isActive` không hợp lệ và quy tắc xóa mềm; không cho xóa mềm ca đã
    được lịch tham chiếu.
-   Viết unit/integration tests cho các luồng CRUD và validation.

### Giai đoạn 4 --- Lịch định kỳ hàng loạt

-   Implement đọc và ghi lịch định kỳ.
-   Implement request DTO hỗ trợ nhiều ngày và nhiều ca trong một
    request.
-   Thực hiện cập nhật hàng loạt trong transaction.
-   Kiểm tra ngày trong tuần, ca tồn tại/đang hoạt động, ngày bắt
    đầu/kết thúc và các khoảng hiệu lực bị chồng lấn.
-   Viết test cho nhân viên làm một ca, nhiều ca trong một ngày, nhiều
    ngày trong tuần, thay đổi lịch từ một ngày hiệu lực mới và request
    không hợp lệ.

### Giai đoạn 5 --- Nghỉ phép và ngoại lệ

-   Implement chức năng quản lý trực tiếp tạo/xem/hủy khoảng nghỉ.
-   Implement ngoại lệ hủy ca và thêm ca theo ngày.
-   Kiểm tra khoảng nghỉ không hợp lệ và cách ngoại lệ tương tác với
    lịch định kỳ.
-   Viết test cho nghỉ một phần ca, nghỉ phủ toàn bộ ca, hủy ca định kỳ,
    thêm ca ngoài lịch và dữ liệu xung đột.

### Giai đoạn 6 --- Bộ tính lịch tổng hợp

-   Implement component tổng hợp lịch theo khoảng ngày.
-   Loại nhân viên `isActive = FALSE` hoặc đã xóa mềm, sau đó áp dụng:
    lịch định kỳ → ngoại lệ → nghỉ phép. Ca không hoạt động không được
    dùng để tạo lịch mới; lịch đã tồn tại phải giữ khả năng diễn giải.
-   Trả về các khoảng thời gian làm việc cuối cùng.
-   Viết test biên cho khoảng thời gian liền kề, giao nhau, nhiều ca
    trong ngày, khoảng ngày qua nhiều tuần và không có lịch.

### Giai đoạn 7 --- Availability API và tích hợp

-   Implement `GET /api/staff/availability`.
-   Chốt DTO/contract với Booking Service.
-   Đảm bảo response phân biệt được không có lịch làm việc và nhân viên
    không hoạt động nếu nghiệp vụ cần phân biệt.
-   Thêm timeout/error handling cho caller; không để lỗi phụ thuộc bị
    biến thành kết quả "không có nhân viên" một cách âm thầm.
-   Kiểm tra API qua Gateway và Swagger theo convention của project.

### Giai đoạn 8 --- Hoàn thiện

-   Chạy toàn bộ tests, kiểm tra migration trên database sạch.
-   Kiểm tra truy vấn lịch trong khoảng thời gian dài và thêm index khi
    có bằng chứng cần thiết.
-   Cập nhật README/API docs của riêng Staff Service, ví dụ
    request/response và cách chạy local.
-   Tổng kết các giới hạn đã biết, đặc biệt là availability chưa tính
    booking/work-order assignments.

## 7. Các quyết định cần chốt trước khi triển khai

1.  `PUT /recurring-schedules` thay thế toàn bộ lịch trong khoảng hiệu
    lực hay chỉ các ngày có mặt trong request. Khuyến nghị thay thế
    trong khoảng được chỉ định.
2.  Garage có cần ca qua đêm không. MVP nên giới hạn ca trong cùng ngày
    nếu chưa có nhu cầu.
3.  Ngoại lệ có chỉ thêm/hủy ca chuẩn hay cần thay đổi giờ bắt đầu/kết
    thúc trong một ngày.
4.  Khi quản lý xóa/hủy một khoảng nghỉ, có cần giữ audit trail hay
    không.
5.  Availability cần trả về nhân viên có lịch bao phủ toàn bộ khoảng yêu
    cầu hay trả về các khoảng làm việc giao với khoảng đó. Khuyến nghị
    Booking Service yêu cầu khoảng thời gian cụ thể và chỉ nhận nhân
    viên có thể đáp ứng toàn bộ khoảng đó.
6.  Chốt timezone của garage và định dạng timestamp trước khi tích hợp
    Booking Service.

## 8. Tiêu chí hoàn thành

-   Quản lý tạo/cập nhật hồ sơ nhân viên và ca làm.
-   Quản lý có thể thiết lập lịch nhiều ngày/nhiều ca trong một request.
-   Có thể xem lịch đã tổng hợp cho một nhân viên hoặc toàn garage trong
    khoảng ngày.
-   Quản lý có thể ghi nhận ngày nghỉ trực tiếp, không cần quy trình gửi
    đơn/phê duyệt.
-   Ngoại lệ có thể thêm hoặc hủy ca theo ngày và có semantics rõ ràng.
-   Availability chỉ trả nhân viên `isActive = TRUE`, chưa bị xóa mềm,
    và tính lịch định kỳ, ngoại lệ cùng khoảng nghỉ chính xác.
-   `isActive` (ngừng hoạt động nghiệp vụ) được phân biệt với
    `deletedAt` (xóa mềm); truy vấn thông thường loại bản ghi đã xóa mềm
    nhưng không mặc định loại bản ghi không hoạt động.
-   Không có truy cập trực tiếp vào database của service khác.
-   Flyway chạy được trên database sạch và tests bao phủ các tình huống
    chính.
-   Tài liệu nêu rõ availability không đồng nghĩa với việc nhân viên
    chưa được booking hoặc phân công công việc.
