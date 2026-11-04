# Booking Service — PLAN

## 1. Mục tiêu và phạm vi

Booking Service chịu trách nhiệm quản lý lịch hẹn đưa xe đến garage, kiểm tra khả năng tiếp nhận dựa trên năng lực kỹ thuật viên, quản lý vòng đời booking và tích hợp với các microservice liên quan.

Booking Service **không phân công kỹ thuật viên cụ thể** khi khách đặt lịch. Service chỉ xác định garage có đủ năng lực nhân sự để tiếp nhận yêu cầu tại thời điểm đó hay không.

### Phạm vi triển khai

- Khách hàng xem các khung giờ còn khả năng tiếp nhận dựa trên danh sách dịch vụ dự kiến.
- Khách hàng tạo booking và nhận trạng thái `CONFIRMED` ngay khi đặt thành công.
- Khách hàng xem lịch hẹn của mình, hủy hoặc đổi lịch theo điều kiện nghiệp vụ.
- Nhân viên có thể tra cứu, quản lý và cập nhật trạng thái booking theo quyền hạn.
- Tính sức chứa dựa trên lịch làm việc thực tế của kỹ thuật viên và nhu cầu nhân sự của từng dịch vụ.
- Lưu snapshot thông tin dịch vụ tại thời điểm đặt lịch.
- Hỗ trợ quy trình tiếp nhận xe tại garage, liên kết booking với xe chính thức và Work Order.
- Tích hợp với Inventory Service, Staff Service, Customer-Vehicle Service và Work Order Service.

### Ngoài phạm vi

- Quản lý tài khoản, xác thực và phân quyền.
- Quản lý danh mục dịch vụ, giá dịch vụ và thời lượng chuẩn.
- Quản lý hồ sơ nhân viên, ca làm, lịch định kỳ, nghỉ phép và ngoại lệ lịch làm việc.
- Quản lý quyền sở hữu xe.
- Phân công kỹ thuật viên cụ thể vào từng công việc.
- Tạo báo giá, quản lý phụ tùng, thực hiện sửa chữa và thanh toán.
- Quản lý khoang sửa chữa hoặc cầu nâng trong phiên bản đầu tiên.

Các nội dung trên thuộc phạm vi của service tương ứng hoặc được quy định trong tài liệu kiến trúc chung.

## 2. Ngữ cảnh nghiệp vụ

### 2.1. Booking là lịch hẹn dự kiến, không phải Work Order

Booking ghi nhận ý định của khách hàng về thời điểm đưa xe đến garage và các dịch vụ dự kiến cần thực hiện.

Booking được xác nhận không có nghĩa là:

- Xe đã đến garage.
- Xe đã được kiểm tra thực tế.
- Danh sách công việc đã được xác nhận cuối cùng.
- Work Order đã được tạo.
- Garage đã phân công kỹ thuật viên cụ thể.

Work Order chỉ được tạo trong quy trình tiếp nhận xe tại garage. Service Advisor kiểm tra xe, xác nhận thông tin và tạo Work Order. Không tự động tạo Work Order chỉ vì booking được xác nhận.

Danh sách dịch vụ trong booking là thông tin dự kiến. Sau khi tiếp nhận, Service Advisor và Work Order Service có thể điều chỉnh công việc theo tình trạng thực tế của xe.

### 2.2. Xác nhận booking

Booking được tạo thành công sẽ có trạng thái `CONFIRMED` ngay lập tức.

Không sử dụng `PENDING_CONFIRMATION` làm trạng thái trung gian cho quy trình đặt lịch thông thường.

Điều kiện để tạo booking thành công:

1. Khách hàng hợp lệ và được phép thực hiện thao tác.
2. Các dịch vụ được chọn tồn tại, đang được cung cấp và có đủ dữ liệu cần thiết để ước tính.
3. Thời gian yêu cầu hợp lệ.
4. Khoảng thời gian đáp ứng các điều kiện vận hành của garage.
5. Nguồn cung kỹ thuật viên đủ đáp ứng nhu cầu tại mọi khoảng thời gian của booking.
6. Việc kiểm tra và ghi nhận booking được thực hiện theo cơ chế chống đặt trùng do các yêu cầu đồng thời.

Nếu bất kỳ điều kiện nào không thỏa mãn, không tạo booking thành công.

### 2.3. Danh sách dịch vụ và thứ tự thực hiện

Khách hàng có thể chọn một hoặc nhiều dịch vụ khi đặt lịch.

Trong phiên bản đầu tiên, giả định các dịch vụ được thực hiện **nối tiếp theo thứ tự lưu trong booking**.

Ví dụ:

| Thứ tự | Dịch vụ | Thời lượng ước tính | Kỹ thuật viên cần |
|---|---|---:|---:|
| 1 | Thay dầu | 30 phút | 1 |
| 2 | Sửa phanh | 60 phút | 3 |
| 3 | Kiểm tra lốp | 15 phút | 1 |

Thời lượng dự kiến của booking là 105 phút. Nhu cầu nhân sự thay đổi theo từng đoạn:

- Phút 0–30: cần 1 kỹ thuật viên.
- Phút 30–90: cần 3 kỹ thuật viên.
- Phút 90–105: cần 1 kỹ thuật viên.

Không lấy số kỹ thuật viên lớn nhất rồi áp dụng cho toàn bộ thời lượng booking. Cách đó sẽ đánh giá thấp sức chứa thực tế của garage.

Đây là mô hình ước tính để đặt lịch, không phải cam kết rằng các dịch vụ chắc chắn được thực hiện theo đúng tiến độ đó. Việc phân công và lập kế hoạch sửa chữa thực tế thuộc quy trình Work Order.

### 2.4. Thông tin xe: Lazy Binding

Khi khách đặt lịch trực tuyến, Booking Service không yêu cầu xe phải tồn tại sẵn trong Customer-Vehicle Service.

Booking lưu:

- `license_plate_snapshot`: biển số do khách nhập.
- `vehicle_id`: để `NULL` cho đến khi xe được xác minh và liên kết tại garage.

Không tạo hồ sơ xe chính thức chỉ dựa trên thông tin khách nhập lúc đặt lịch.

Tại thời điểm tiếp nhận:

1. Service Advisor kiểm tra xe thực tế và biển số.
2. Tra cứu xe trong Customer-Vehicle Service.
3. Nếu cần, tạo hồ sơ xe chính thức.
4. Cập nhật `vehicle_id` vào booking.
5. Liên kết booking và xe với Work Order được tạo trong quy trình tiếp nhận.

Các thao tác liên service phải có khả năng retry và tránh tạo trùng hồ sơ xe hoặc Work Order. Không giả định rằng nhiều microservice có thể được cập nhật trong một transaction cơ sở dữ liệu duy nhất.

### 2.5. Khách hàng và booking

Booking lưu `customer_id` để xác định khách hàng thực hiện lịch hẹn.

Booking Service không quản lý hồ sơ khách hàng và không tự tạo Customer. Việc xác định Customer hợp lệ và quy tắc truy cập dữ liệu tuân theo thiết kế của Customer-Vehicle Service và tài liệu kiến trúc chung.

Không suy luận quyền sở hữu xe từ việc một khách hàng đặt booking cho biển số nào đó.

## 3. Tích hợp với các service

### 3.1. Inventory Service (Catalog dịch vụ)

`inventory-service` là nguồn dữ liệu chuẩn về dịch vụ (project không có
service tên riêng "Catalog Service").

Booking Service cần lấy tối thiểu:

- ID dịch vụ.
- Tên dịch vụ.
- Trạng thái có được cung cấp hay không.
- `duration_minutes`.
- `required_techs`.

Ý nghĩa:

- `duration_minutes`: thời lượng ước tính để thực hiện một dịch vụ.
- `required_techs`: số kỹ thuật viên cần đồng thời thực hiện dịch vụ đó theo mô hình ước tính của Inventory Service.

Không tự đặt thời lượng mặc định hoặc tự suy diễn số kỹ thuật viên khi Inventory Service không trả về dữ liệu hợp lệ.

Khi tạo booking, lưu snapshot của tên dịch vụ, thời lượng và nhu cầu kỹ thuật viên để bảo toàn cơ sở tính toán tại thời điểm đặt lịch.

### 3.2. Staff Service

Staff Service chịu trách nhiệm tổng hợp lịch làm việc thực tế của nhân viên, bao gồm lịch định kỳ, ca làm, ngoại lệ và khoảng nghỉ theo nghiệp vụ của service này.

Booking Service không tự triển khai lại các quy tắc tổng hợp lịch của Staff Service.

Đối với thuật toán sức chứa biến đổi theo thời gian trong tài liệu này, Booking Service cần nhận được **các khoảng làm việc thực tế của từng kỹ thuật viên trong khoảng thời gian được yêu cầu**. Chi tiết hợp đồng API được mô tả tại mục 5.

Booking Service sử dụng dữ liệu đó để tính tổng số kỹ thuật viên khả dụng tại từng thời điểm, rồi so sánh với nhu cầu từ các booking hiện có và booking mới.

Staff Service không có trách nhiệm giữ chỗ kỹ thuật viên cho booking.

### 3.3. Customer-Vehicle Service

Service này cung cấp thông tin Customer và Vehicle chính thức.

Booking Service giữ `customer_id`, biển số snapshot và `vehicle_id` nullable. Khi tiếp nhận xe, Booking Service cần hỗ trợ liên kết với `vehicle_id` chính thức.

Không sao chép toàn bộ hồ sơ Customer hoặc Vehicle vào cơ sở dữ liệu booking.

### 3.4. Work Order Service

Work Order Service quản lý quá trình sửa chữa thực tế.

Luồng nghiệp vụ dự kiến:

1. Booking được xác nhận.
2. Khách đưa xe đến garage.
3. Service Advisor thực hiện tiếp nhận.
4. Xe được xác minh hoặc tạo hồ sơ chính thức trong Customer-Vehicle Service.
5. Booking được liên kết với xe chính thức.
6. Work Order được tạo và liên kết với booking.
7. Booking được cập nhật trạng thái tiếp nhận.
8. Các cập nhật tiếp theo được thực hiện theo sự kiện hoặc API tích hợp đã thống nhất với Work Order Service.

Không tạo Work Order ngay khi booking được xác nhận.

Các thao tác tiếp nhận và tạo Work Order phải có cơ chế idempotency. Nếu yêu cầu bị timeout và được retry, hệ thống không được tạo nhiều Work Order cho cùng một lần tiếp nhận.

## 4. Mô hình dữ liệu dự kiến

Tên bảng, cột và kiểu dữ liệu chính xác sẽ được xác nhận trong bước thiết kế schema. Không tạo bản sao dữ liệu thuộc quyền sở hữu của service khác.

### 4.1. `bookings`

Các trường nghiệp vụ chính:

| Trường | Ý nghĩa |
|---|---|
| `id` | ID booking |
| `customer_id` | ID Customer |
| `vehicle_id` | ID Vehicle chính thức, nullable trước khi tiếp nhận |
| `license_plate_snapshot` | Biển số khách cung cấp khi đặt lịch |
| `start_at` | Thời điểm bắt đầu dự kiến |
| `end_at` | Thời điểm kết thúc dự kiến, bằng tổng thời lượng các dịch vụ |
| `status` | Trạng thái booking |
| `customer_note` | Ghi chú của khách |
| `created_at`, `updated_at` | Thời điểm tạo và cập nhật |
| `cancelled_at` | Thời điểm hủy, nếu có |
| `checked_in_at` | Thời điểm tiếp nhận, nếu có |

Có thể bổ sung `work_order_id` nếu phù hợp với hợp đồng tích hợp và yêu cầu tra cứu. Trường này chỉ là tham chiếu đến ID bên ngoài, không phải khóa ngoại liên service.

Các index cần xem xét:

- Theo `customer_id` và thời gian tạo hoặc thời gian bắt đầu.
- Theo `status` và `start_at` để tra cứu booking đang chiếm dụng sức chứa.
- Theo `start_at`, `end_at` để tối ưu truy vấn booking giao với khoảng thời gian cần kiểm tra.

Không giả định rằng index thông thường tự giải quyết được bài toán chống đặt trùng sức chứa.

### 4.2. `booking_services`

Lưu danh sách dịch vụ dự kiến theo thứ tự thực hiện.

| Trường | Ý nghĩa |
|---|---|
| `id` | ID dòng dịch vụ |
| `booking_id` | Booking sở hữu dòng dịch vụ |
| `service_id` | ID dịch vụ bên Inventory Service |
| `service_name_snapshot` | Tên dịch vụ tại thời điểm đặt |
| `estimated_duration_minutes` | Thời lượng snapshot (copy từ `duration_minutes`) |
| `required_technicians_snapshot` | Nhu cầu kỹ thuật viên snapshot (copy từ `required_techs`) |
| `sequence_number` | Thứ tự thực hiện trong booking |

`sequence_number` xác định thứ tự các dịch vụ nối tiếp nhau. Phải có quy tắc đảm bảo thứ tự ổn định và không mơ hồ.

`booking_id` là quan hệ nội bộ của Booking Service. `service_id` là tham chiếu logic đến Inventory Service, không phải khóa ngoại liên service.

Snapshot là dữ liệu dùng để tái dựng kế hoạch ước tính ban đầu. Không tự động ghi đè snapshot lịch sử khi Inventory Service thay đổi thời lượng hoặc nhu cầu nhân sự.

### 4.3. `booking_status_histories` — tùy chọn

Có thể sử dụng để ghi nhận lịch sử chuyển trạng thái nếu nghiệp vụ cần audit hoặc tra cứu diễn biến booking.

Không bắt buộc triển khai nếu chưa có yêu cầu sử dụng rõ ràng và dự án đã có cơ chế ghi nhận phù hợp.

### 4.4. Trạng thái booking

Các trạng thái dự kiến:

- `CONFIRMED`: đặt lịch thành công và đang giữ sức chứa.
- `CANCELLED`: lịch đã bị hủy và không còn chiếm sức chứa.
- `NO_SHOW`: khách không đến theo quy trình xác nhận no-show.
- `CHECKED_IN`: khách đã đến và booking đang được xử lý trong quy trình tiếp nhận.
- `FULFILLED`: vòng đời booking đã hoàn tất theo định nghĩa nghiệp vụ được thống nhất với Work Order Service.

Trạng thái cuối cùng và các chuyển trạng thái phải được xác nhận trước khi triển khai. Đặc biệt, cần thống nhất thời điểm booking chuyển sang `FULFILLED` và sự kiện nào từ Work Order Service là nguồn kích hoạt.

Chỉ các trạng thái thực sự giữ chỗ mới được tính vào nhu cầu sức chứa. Việc xác định danh sách trạng thái này phải được tập trung trong một quy tắc nghiệp vụ của Booking Service, không rải các điều kiện kiểm tra trạng thái ở nhiều nơi.

## 5. Thuật toán tính sức chứa kỹ thuật viên

Đây là phần trọng tâm của Booking Service.

### 5.1. Mục tiêu

Với một thời điểm bắt đầu dự kiến và danh sách dịch vụ khách chọn, xác định liệu garage có đủ kỹ thuật viên để thực hiện toàn bộ chuỗi dịch vụ hay không.

Thuật toán phải đồng thời xét:

1. Nguồn cung kỹ thuật viên thay đổi theo lịch làm việc thực tế.
2. Nhu cầu của từng dịch vụ trong booking mới.
3. Nhu cầu của các booking đã tồn tại và còn chiếm dụng sức chứa.
4. Thứ tự nối tiếp của dịch vụ trong từng booking.
5. Các thời điểm bắt đầu và kết thúc dịch vụ, ca làm và khoảng nghỉ.

Không được chỉ đếm số nhân viên đang làm việc vào thời điểm bắt đầu booking. Một booking chỉ hợp lệ khi đủ nhân sự tại **mọi thời điểm trong toàn bộ thời gian dự kiến**.

### 5.2. Quy ước khoảng thời gian

Tất cả khoảng thời gian sử dụng quy ước nửa mở:

`[startAt, endAt)`

Bao gồm thời điểm bắt đầu nhưng không bao gồm thời điểm kết thúc.

Ví dụ:

- Ca A: `[08:00, 12:00)`.
- Ca B: `[12:00, 17:00)`.

Hai ca tiếp giáp nhau tại 12:00. Ca A không còn đóng góp nguồn cung từ 12:00 trở đi; ca B đóng góp nguồn cung từ 12:00 trở đi.

Tương tự, một dịch vụ kết thúc lúc 09:00 và dịch vụ tiếp theo bắt đầu lúc 09:00 không bị tính là chồng lấn.

Mọi phép so sánh, truy vấn overlap và xử lý sự kiện phải tuân theo cùng quy ước này.

### 5.3. Bước 1 — Xây dựng chuỗi dịch vụ của booking mới

Đầu vào:

- `reqStart`: thời điểm bắt đầu dự kiến.
- `newBookingServices`: danh sách dịch vụ theo thứ tự khách chọn.

Với mỗi dịch vụ, lấy snapshot hợp lệ từ Inventory Service và xác nhận:

- `duration > 0`.
- `requiredTechnicians >= 1`.
- Dịch vụ đang được phép đặt.
- Không có dịch vụ trùng hoặc dữ liệu bất hợp lệ theo quy tắc nghiệp vụ đã chọn.

Khởi tạo `cursor = reqStart`.

Duyệt các dịch vụ theo thứ tự:

1. `serviceStart = cursor`.
2. `serviceEnd = serviceStart + duration`.
3. Tạo khoảng nhu cầu `[serviceStart, serviceEnd)` với mức nhu cầu `requiredTechnicians`.
4. Gán `cursor = serviceEnd`.

Sau khi duyệt hết danh sách:

- `reqEnd = cursor`.
- Tổng thời lượng bằng tổng thời lượng snapshot của các dịch vụ.
- Booking mới có một chuỗi các khoảng nhu cầu nhân sự nối tiếp nhau.

Ví dụ, bắt đầu lúc 08:00:

| Dịch vụ | Khoảng thực hiện | Nhu cầu |
|---|---|---:|
| Thay dầu, 30 phút | 08:00–08:30 | 1 |
| Sửa phanh, 60 phút | 08:30–09:30 | 3 |
| Kiểm tra lốp, 15 phút | 09:30–09:45 | 1 |

Thời gian booking là `[08:00, 09:45)`.

Không lấy `max(requiredTechnicians) = 3` để coi cả 105 phút đều cần 3 thợ. Nhu cầu phải biến đổi theo từng khoảng dịch vụ.

Nếu danh sách dịch vụ rỗng, thời lượng không hợp lệ hoặc dữ liệu không thể xác minh, không tiếp tục tính sức chứa.

### 5.4. Bước 2 — Lấy nguồn cung thực tế từ Staff Service

Sweep Line cần biết nguồn cung tại từng đoạn thời gian, không chỉ tổng số thợ có thể làm việc liên tục trong toàn bộ booking.

Dữ liệu nguồn cung cần có dạng các khoảng làm việc của từng kỹ thuật viên, ví dụ:

| Kỹ thuật viên | Khoảng làm việc thực tế |
|---|---|
| A | 08:00–12:00 |
| B | 08:00–17:00 |
| C | 09:00–17:00 |
| D | 08:00–08:30 và 09:00–17:00 |

Các khoảng này phải phản ánh kết quả tổng hợp lịch làm việc của Staff Service, bao gồm lịch định kỳ, ngoại lệ và thời gian nghỉ theo quy tắc của service đó.

**Yêu cầu hợp đồng API:** Booking Service cần một API hoặc cơ chế đọc lịch tổng hợp cho phép lấy các khoảng làm việc thực tế của từng nhân viên trong `[reqStart, reqEnd)`. Dữ liệu phải xác định được từng nhân viên và các khoảng không chồng lấn của người đó.

API hiện tại chỉ trả về danh sách nhân viên có thể làm việc liên tục trong toàn bộ khoảng được hỏi không đủ để tái dựng nguồn cung biến đổi theo thời gian. Không được dùng số lượng nhân viên của API đó làm nguồn cung cố định cho toàn booking.

Nếu Staff Service chưa cung cấp dữ liệu phù hợp, phải bổ sung hợp đồng API trước khi triển khai thuật toán này. Không tự tính lại toàn bộ lịch định kỳ, ngoại lệ và nghỉ phép ở Booking Service.

#### Chuẩn hóa nguồn cung

Đối với mỗi nhân viên:

- Chỉ tính nhân viên đủ điều kiện tham gia công việc theo quy tắc của hệ thống.
- Chỉ sử dụng các khoảng giao với `[reqStart, reqEnd)`.
- Cắt khoảng tại biên yêu cầu nếu cần.
- Đảm bảo các khoảng của cùng một nhân viên không bị chồng lấn hoặc đếm trùng.
- Nếu các khoảng của cùng một nhân viên tiếp giáp nhau, có thể gộp thành một khoảng liên tục.

Ví dụ, nếu một nhân viên có hai bản ghi `[08:00, 12:00)` và `[12:00, 17:00)`, nguồn cung của nhân viên đó chỉ là một người liên tục từ 08:00 đến 17:00, không phải hai người tại 12:00.

Sau chuẩn hóa, mỗi khoảng làm việc đóng góp `+1` khi bắt đầu và `-1` khi kết thúc.

### 5.5. Bước 3 — Lấy tải từ các booking hiện có

Truy vấn các booking có khoảng thời gian giao với `[reqStart, reqEnd)` và thuộc trạng thái còn giữ sức chứa.

Không chỉ truy vấn booking bắt đầu bên trong khoảng yêu cầu. Một booking bắt đầu trước `reqStart` nhưng kết thúc sau `reqStart` vẫn có thể chiếm nhân lực.

Đối với mỗi booking hiện có:

1. Đọc `start_at`.
2. Đọc các dòng `booking_services` theo `sequence_number`.
3. Tái dựng các khoảng dịch vụ nối tiếp từ `start_at`.
4. Mỗi dịch vụ đóng góp nhu cầu bằng `required_technicians_snapshot` trong khoảng thực hiện của nó.
5. Chỉ giữ các khoảng giao với `[reqStart, reqEnd)`.

Ví dụ:

Booking hiện có bắt đầu lúc 08:15:

| Dịch vụ | Khoảng thực hiện | Nhu cầu |
|---|---|---:|
| Thay dầu, 30 phút | 08:15–08:45 | 1 |
| Sửa phanh, 60 phút | 08:45–09:45 | 3 |

Nếu booking mới cần được kiểm tra trong khoảng 08:30–09:30, chỉ phần nhu cầu giao với khoảng đó được đưa vào phép tính. Tuy nhiên, khi dựng lại chuỗi dịch vụ, phải cộng dồn thời lượng từ thời điểm bắt đầu thực sự của booking, không được bắt đầu tính lại từ `reqStart`.

Mỗi khoảng nhu cầu đóng góp:

- `+requiredTechnicians` tại thời điểm bắt đầu.
- `-requiredTechnicians` tại thời điểm kết thúc.

Không tính các booking đã hủy hoặc các trạng thái khác đã được xác định là không còn giữ sức chứa.

Không cộng nhu cầu của Work Order vào tải booking nếu Work Order đó vẫn tương ứng với cùng booking và cùng thời gian đã được tính. Tránh tính một công việc hai lần.

### 5.6. Bước 4 — Tạo danh sách sự kiện

Tạo một danh sách sự kiện gồm hai nhóm: nguồn cung và nhu cầu.

#### Sự kiện nguồn cung

Với mỗi khoảng làm việc thực tế `[shiftStart, shiftEnd)` của một kỹ thuật viên:

- `(shiftStart, SUPPLY_UP, +1)`.
- `(shiftEnd, SUPPLY_DOWN, -1)`.

#### Sự kiện nhu cầu từ booking hiện có

Với mỗi khoảng dịch vụ `[serviceStart, serviceEnd)`:

- `(serviceStart, DEMAND_UP, +requiredTechnicians)`.
- `(serviceEnd, DEMAND_DOWN, -requiredTechnicians)`.

#### Sự kiện nhu cầu từ booking mới

Dùng các khoảng dịch vụ đã xây dựng tại bước 1, tạo sự kiện theo cùng quy tắc.

Booking mới được đưa vào phép tính như một booking giả định. Chỉ khi vượt qua toàn bộ kiểm tra mới được ghi nhận chính thức.

### 5.7. Bước 5 — Sắp xếp và gộp sự kiện cùng thời điểm

Sắp xếp tất cả sự kiện theo thời gian tăng dần.

Tại một thời điểm có thể đồng thời xuất hiện:

- Nhân viên bắt đầu ca.
- Nhân viên kết thúc ca.
- Dịch vụ kết thúc.
- Dịch vụ tiếp theo bắt đầu.

Không nên phụ thuộc vào thứ tự duyệt từng sự kiện riêng lẻ để kiểm tra tính khả thi. Thay vào đó, **gộp tất cả sự kiện có cùng timestamp, áp dụng toàn bộ thay đổi tại timestamp đó rồi kiểm tra khoảng tiếp theo**.

Tại timestamp `t`:

- Cộng các thay đổi nguồn cung tại `t` để có `supplyAfter`.
- Cộng các thay đổi nhu cầu tại `t` để có `demandAfter`.
- Kiểm tra điều kiện cho đoạn `[t, nextTimestamp)`.

Cách xử lý này nhất quán với khoảng nửa mở `[start, end)`. Một nhân viên kết thúc ca đúng lúc nhân viên khác bắt đầu ca sẽ không tạo ra lỗi giả do thứ tự xử lý sự kiện.

### 5.8. Bước 6 — Quét Sweep Line và kiểm tra sức chứa

Khởi tạo:

- `currentSupply = 0`.
- `currentDemand = 0`.

Tập sự kiện phải bao gồm mọi mốc bắt đầu và kết thúc cần thiết trong khoảng yêu cầu. Nếu triển khai theo cách cắt khoảng, trạng thái nguồn cung và nhu cầu tại `reqStart` phải được xác định chính xác, bao gồm các khoảng đã bắt đầu trước `reqStart` nhưng còn hiệu lực tại đó.

Với mỗi timestamp `t` theo thứ tự tăng dần:

1. Áp dụng tất cả thay đổi nguồn cung tại `t`.
2. Áp dụng tất cả thay đổi nhu cầu tại `t`.
3. Xác định timestamp tiếp theo `nextT`.
4. Nếu `[t, nextT)` giao với khoảng booking mới, kiểm tra nguồn cung và nhu cầu trên đoạn giao đó.
5. Nếu `currentDemand > currentSupply` trên bất kỳ đoạn nào, booking không khả thi.
6. Nếu toàn bộ các đoạn đều thỏa mãn, booking vượt qua kiểm tra sức chứa.

Vì mọi thay đổi nguồn cung và nhu cầu đều nằm tại các timestamp sự kiện, hai giá trị này không đổi bên trong đoạn giữa hai timestamp liên tiếp. Do đó, chỉ cần kiểm tra từng đoạn như trên, không cần kiểm tra từng phút.

Điều kiện cốt lõi:

`currentDemand <= currentSupply`

Điều kiện phải đúng trên toàn bộ `[reqStart, reqEnd)`, không chỉ tại thời điểm bắt đầu và cũng không chỉ tại các thời điểm xảy ra sự kiện.

#### Ví dụ minh họa

Giả sử nguồn cung và tải từ các booking cũ như sau:

| Khoảng thời gian | Thợ khả dụng | Tải cũ | Nhu cầu booking mới | Tổng nhu cầu | Kết quả |
|---|---:|---:|---:|---:|---|
| 08:00–08:30 | 4 | 2 | 1 | 3 | Đủ |
| 08:30–09:00 | 4 | 1 | 3 | 4 | Đủ |
| 09:00–09:30 | 3 | 1 | 3 | 4 | Thiếu |

Booking mới bị từ chối vì trong khoảng 09:00–09:30 cần 4 kỹ thuật viên nhưng chỉ có 3 người khả dụng.

Không được lấy nguồn cung tối đa trong ngày, nguồn cung tại thời điểm bắt đầu hoặc nguồn cung trung bình để thay thế cho việc kiểm tra này.

### 5.9. Pseudocode tham chiếu

Pseudocode sau mô tả thuật toán kiểm tra. Đây là logic nghiệp vụ tham chiếu, không phải chỉ dẫn bắt buộc về tên lớp hoặc cấu trúc code.

```text
function isSlotAvailable(reqStart, newBookingServices):
    newDemandIntervals = buildSequentialIntervals(
        reqStart,
        newBookingServices
    )

    reqEnd = endOfLastInterval(newDemandIntervals)

    validatePositiveDurationsAndTechnicianCounts(
        newBookingServices
    )

    supplyIntervals = staffService.getWorkingIntervals(
        reqStart,
        reqEnd
    )

    existingBookings = findCapacityConsumingBookingsOverlapping(
        reqStart,
        reqEnd
    )

    normalizedSupply = normalizeAndClipSupplyIntervals(
        supplyIntervals,
        reqStart,
        reqEnd
    )

    existingDemand = reconstructAndClipExistingDemand(
        existingBookings,
        reqStart,
        reqEnd
    )

    events = []

    for interval in normalizedSupply:
        events.add(interval.start, SUPPLY, +1)
        events.add(interval.end, SUPPLY, -1)

    for interval in existingDemand:
        events.add(
            interval.start,
            DEMAND,
            +interval.requiredTechnicians
        )
        events.add(
            interval.end,
            DEMAND,
            -interval.requiredTechnicians
        )

    for interval in newDemandIntervals:
        events.add(
            interval.start,
            DEMAND,
            +interval.requiredTechnicians
        )
        events.add(
            interval.end,
            DEMAND,
            -interval.requiredTechnicians
        )

    events = groupByTimestamp(events)
    events = sortByTimestamp(events)

    currentSupply = supplyAtReqStart(normalizedSupply)
    currentDemand = demandAtReqStart(existingDemand)
    currentDemand += demandAtReqStart(newDemandIntervals)

    for each timestamp t with next timestamp nextT:
        apply all supply changes at t
        apply all demand changes at t

        segmentStart = max(t, reqStart)
        segmentEnd = min(nextT, reqEnd)

        if segmentStart < segmentEnd:
            if currentDemand > currentSupply:
                return false

    return true
```

Khi triển khai, phải bảo đảm trạng thái ban đầu và cách cắt khoảng nhất quán. Có thể chọn một trong hai cách:

- Cắt các khoảng tại `reqStart` và khởi tạo nguồn cung/nhu cầu từ các khoảng còn hiệu lực tại `reqStart`, đồng thời bỏ các sự kiện trước thời điểm này.
- Giữ sự kiện trước `reqStart`, tính trạng thái tích lũy chính xác rồi bắt đầu kiểm tra các đoạn trong khoảng yêu cầu.

Không được kết hợp hai cách một cách thiếu nhất quán vì sẽ dẫn đến đếm thiếu hoặc đếm trùng.

### 5.10. Điều kiện biên và dữ liệu bất thường

Phải xử lý rõ các trường hợp:

- Không có kỹ thuật viên khả dụng trong một đoạn.
- Một nhân viên có nhiều khoảng làm việc trong cùng ngày.
- Khoảng nghỉ làm gián đoạn ca.
- Một booking hiện có bắt đầu trước `reqStart`.
- Nhiều sự kiện trùng timestamp.
- Các dịch vụ nối tiếp có điểm kết thúc trùng điểm bắt đầu.
- Booking đi qua nửa đêm hoặc ranh giới ngày.
- Inventory Service trả về dịch vụ không hợp lệ hoặc thiếu dữ liệu.
- Staff Service không trả về được lịch hoặc dữ liệu lịch không hợp lệ.

Không được diễn giải lỗi khi truy vấn lịch Staff Service thành nguồn cung bằng 0 rồi trả kết quả “không có slot” như thể đó là dữ liệu nghiệp vụ bình thường. Cần phân biệt không đủ sức chứa với lỗi phụ thuộc service.

Đối với booking đi qua nửa đêm, các timestamp phải là thời điểm đầy đủ, có ngày và múi giờ thống nhất. Không chỉ dùng `LocalTime` để so sánh toàn bộ khoảng.

### 5.11. Tìm các khung giờ khả dụng

API tìm slot có thể sinh các thời điểm bắt đầu ứng viên theo độ phân giải được cấu hình, ví dụ mỗi 30 phút.

Với mỗi thời điểm bắt đầu:

1. Dựng chuỗi dịch vụ và tính `reqEnd`.
2. Kiểm tra giới hạn giờ hoạt động và các điều kiện đặt lịch khác.
3. Chạy thuật toán sức chứa trên toàn bộ `[reqStart, reqEnd)`.
4. Chỉ trả về ứng viên nếu tất cả các đoạn đều đủ nhân sự.

Độ phân giải 30 phút chỉ là bước sinh thời điểm bắt đầu, không có nghĩa dịch vụ phải có thời lượng là bội số của 30 phút.

API tìm slot chỉ cung cấp kết quả tại thời điểm truy vấn. Slot được trả về chưa phải là một reservation và không đảm bảo còn khả dụng khi khách gửi yêu cầu đặt lịch sau đó.

### 5.12. Chống đặt trùng do đồng thời

Hai yêu cầu đặt lịch có thể cùng vượt qua kiểm tra sức chứa khi chưa có booking nào được ghi nhận, sau đó đồng thời được tạo và khiến tổng nhu cầu vượt nguồn cung.

Do đó, luồng tạo booking phải phối hợp việc kiểm tra sức chứa và ghi nhận booking bằng cơ chế đồng bộ phù hợp.

Phương án triển khai cần được lựa chọn và kiểm chứng trước khi phát triển:

- Khóa theo ngày hoặc các bucket thời gian liên quan.
- Reservation theo slot/bucket có kiểm soát đồng thời.
- Hoặc cơ chế khóa và tính lại tải phù hợp với thiết kế dữ liệu thực tế.

Nếu dùng bucket, phải bảo đảm độ phân giải bucket không làm bỏ qua xung đột ở các khoảng dịch vụ có thời lượng lẻ hoặc điểm bắt đầu/kết thúc không trùng biên bucket.

Không được dựa vào việc hai request gọi API kiểm tra lần lượt nhưng ghi booking không có đồng bộ. Không dùng một khóa đơn giản chỉ theo `reqStart` nếu các booking có thời điểm bắt đầu khác nhau nhưng khoảng thực hiện chồng lấn.

Nếu thao tác tạo booking thất bại sau khi đã giữ reservation, phải giải phóng hoặc hết hạn reservation theo cơ chế đã chọn. Không để reservation lỗi giữ sức chứa vô thời hạn.

## 6. Vòng đời booking

### 6.1. Tạo booking

Luồng nghiệp vụ:

1. Nhận yêu cầu và danh sách dịch vụ theo thứ tự khách chọn.
2. Lấy thông tin dịch vụ từ Inventory Service.
3. Kiểm tra dữ liệu và tạo snapshot.
4. Tính tổng thời lượng và chuỗi nhu cầu nhân sự.
5. Kiểm tra các điều kiện vận hành.
6. Lấy lịch nhân sự thực tế từ Staff Service.
7. Tính sức chứa bằng Sweep Line.
8. Trong cơ chế đồng bộ khi tạo booking, kiểm tra lại sức chứa nếu cần và ghi booking cùng các dòng dịch vụ.
9. Trả booking ở trạng thái `CONFIRMED`.

Việc trả `CONFIRMED` chỉ được thực hiện khi booking đã được ghi nhận thành công và chiếm sức chứa theo cơ chế đã chọn.

### 6.2. Hủy booking

Khách hàng có thể yêu cầu hủy booking theo điều kiện nghiệp vụ được thống nhất.

Khi hủy thành công:

- Cập nhật trạng thái booking.
- Ghi nhận thời điểm hủy.
- Booking không còn được tính là tải đang giữ sức chứa.
- Các lần retry không được tạo thêm tác dụng phụ.

Nếu booking đã bước vào quy trình tiếp nhận hoặc Work Order đã được tạo, việc hủy cần được kiểm tra theo trạng thái và quy trình phối hợp với Work Order Service, không xử lý như booking chưa sử dụng.

### 6.3. Đổi lịch

Đổi lịch phải được xử lý như một thao tác nghiệp vụ có kiểm soát:

1. Xác định booking hiện tại và quyền thay đổi.
2. Tính thời lượng và nhu cầu của lịch mới.
3. Kiểm tra sức chứa cho lịch mới.
4. Thực hiện cập nhật theo cơ chế đồng bộ đã chọn.
5. Chỉ giải phóng lịch cũ khi thao tác đổi lịch đã thành công theo thiết kế transaction/reservation.

Không được hủy lịch cũ trước, sau đó mới thử đặt lịch mới mà không có phương án xử lý khi đặt lịch mới thất bại.

### 6.4. Tiếp nhận xe

Luồng tiếp nhận phải được thiết kế sao cho có thể retry an toàn:

- Xác minh booking.
- Xác minh biển số và xe thực tế.
- Tìm hoặc tạo Vehicle chính thức.
- Gắn `vehicle_id` vào booking.
- Tạo hoặc liên kết Work Order.
- Cập nhật trạng thái tiếp nhận khi điều kiện nghiệp vụ tương ứng được thỏa mãn.

Không tạo Work Order từ sự kiện booking được xác nhận.

### 6.5. No-show và hoàn tất

No-show chỉ được ghi nhận theo quy trình xác định rằng khách không đến, không phải vì booking hết giờ hoặc request tích hợp bị lỗi.

`FULFILLED` phải có định nghĩa rõ ràng về điều kiện hoàn tất. Nếu trạng thái này phụ thuộc vào Work Order Service, cần xác định sự kiện hoặc hợp đồng tích hợp tương ứng trước khi triển khai.

## 7. API dự kiến

Các endpoint dưới đây là đề xuất thiết kế, cần thống nhất với conventions và authorization hiện có trước khi triển khai.

### 7.1. Khách hàng

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/bookings/availability` | Tìm các khung giờ còn sức chứa |
| `POST` | `/api/bookings` | Tạo booking và xác nhận ngay |
| `GET` | `/api/bookings/me` | Danh sách booking của khách hiện tại |
| `GET` | `/api/bookings/{id}` | Chi tiết booking nếu khách có quyền truy cập |
| `POST` hoặc `PATCH` | `/api/bookings/{id}/cancel` | Hủy booking |
| `PATCH` | `/api/bookings/{id}/reschedule` | Đổi lịch booking |

Request tìm slot cần có ngày hoặc khoảng thời gian tìm kiếm và danh sách ID dịch vụ theo thứ tự mong muốn.

Response tìm slot nên chứa tối thiểu thời điểm bắt đầu, thời điểm kết thúc dự kiến và thông tin cần thiết để khách chọn lịch. Không coi kết quả tìm slot là cam kết giữ chỗ.

Request tạo booking cần chứa thời điểm bắt đầu, danh sách dịch vụ có thứ tự, biển số snapshot và ghi chú tùy chọn.

Khách hàng không được tự truyền `customer_id` tùy ý để tạo booking cho người khác. ID khách hàng phải được xác định từ ngữ cảnh xác thực hoặc theo luồng nghiệp vụ được cho phép.

### 7.2. Nhân viên

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/bookings` | Tra cứu booking theo bộ lọc |
| `GET` | `/api/bookings/{id}` | Xem chi tiết booking |
| `PATCH` | `/api/bookings/{id}/status` | Cập nhật trạng thái khi được phép |
| `PATCH` | `/api/bookings/{id}/vehicle` | Liên kết xe chính thức sau khi xác minh |
| `POST` | `/api/bookings/{id}/check-in` | Thực hiện hoặc khởi tạo quy trình tiếp nhận |

Các endpoint phục vụ tiếp nhận và liên kết Work Order cần có thiết kế idempotency, xác thực chuyển trạng thái và kiểm tra trạng thái hiện tại. Không để một endpoint tổng quát cho phép chuyển tùy ý giữa mọi trạng thái.

## 8. Các quyết định nghiệp vụ đã chốt

- Booking thành công chuyển thẳng sang `CONFIRMED`.
- Booking không tự động tạo Work Order.
- Vehicle có thể chưa tồn tại khi khách đặt lịch; `vehicle_id` ban đầu nullable.
- Biển số khách nhập được lưu dưới dạng snapshot.
- Các dịch vụ trong booking được thực hiện nối tiếp theo thứ tự khách chọn.
- Thời lượng và nhu cầu kỹ thuật viên được lấy từ Inventory Service và lưu snapshot.
- Không phân công kỹ thuật viên cụ thể lúc đặt lịch.
- Sức chứa được kiểm tra theo nhu cầu của từng dịch vụ và nguồn cung thay đổi theo thời gian.
- Sweep Line kiểm tra điều kiện đủ nhân sự trên từng đoạn giữa hai mốc sự kiện.
- Lịch làm việc thực tế do Staff Service tổng hợp; Booking Service không tự triển khai lại logic lịch.
- Kết quả tìm slot không phải reservation.
- Tạo và đổi lịch phải chống được các request đồng thời gây vượt sức chứa.

## 9. Thứ tự triển khai đề xuất

### Giai đoạn 1 — Chốt hợp đồng tích hợp

- Xác nhận API Inventory Service cung cấp đủ dữ liệu dịch vụ.
- Xác nhận hợp đồng Staff Service cung cấp các khoảng làm việc thực tế của từng nhân viên.
- Xác nhận hợp đồng với Customer-Vehicle Service cho tra cứu/tạo Vehicle.
- Xác nhận quy trình tiếp nhận và tạo Work Order.
- Chốt trạng thái booking và trạng thái nào giữ sức chứa.

### Giai đoạn 2 — Thiết kế dữ liệu

- Thiết kế `bookings`.
- Thiết kế `booking_services` và thứ tự dịch vụ.
- Thiết kế index phục vụ truy vấn booking giao với khoảng thời gian.
- Quyết định có cần `booking_status_histories` hay không.
- Xác định quy tắc snapshot và tính tương thích khi Inventory Service thay đổi dữ liệu.

### Giai đoạn 3 — Thuật toán sức chứa

- Dựng chuỗi dịch vụ nối tiếp.
- Chuẩn hóa khoảng cung từ Staff Service.
- Tái dựng nhu cầu của booking hiện có.
- Xây dựng bộ tạo và gộp sự kiện Sweep Line.
- Kiểm tra sức chứa theo từng đoạn.
- Kiểm thử ca tiếp giáp, nghỉ giữa ca, booking chồng lấn và booking qua ngày.

### Giai đoạn 4 — API tìm slot và tạo booking

- Triển khai API tìm slot.
- Triển khai tạo booking ở trạng thái `CONFIRMED`.
- Tích hợp kiểm tra sức chứa với cơ chế đồng bộ khi ghi booking.
- Xử lý lỗi và retry khi các service phụ thuộc không khả dụng.

### Giai đoạn 5 — Quản lý booking

- Danh sách và chi tiết booking.
- Hủy booking.
- Đổi lịch an toàn.
- Quản lý trạng thái và quy tắc giải phóng sức chứa.

### Giai đoạn 6 — Tiếp nhận xe và Work Order

- Liên kết Vehicle chính thức.
- Tích hợp quy trình tạo Work Order.
- Xử lý idempotency và các tình huống retry.
- Đồng bộ trạng thái booking theo hợp đồng đã thống nhất.

### Giai đoạn 7 — Kiểm thử tích hợp

Tập trung vào:

- Đặt lịch thành công và từ chối khi thiếu nhân sự.
- Nhu cầu thay đổi theo từng dịch vụ nối tiếp.
- Nguồn cung thay đổi theo giờ làm, nghỉ và ngoại lệ.
- Hai booking bắt đầu khác nhau nhưng chồng lấn.
- Hai request đồng thời cùng đặt vào sức chứa cuối cùng.
- Hủy hoặc đổi lịch và ảnh hưởng tới sức chứa.
- Lỗi Inventory Service hoặc Staff Service.
- Tiếp nhận xe và tạo Work Order nhiều lần do retry.

## 10. Tiêu chí hoàn thành

Booking Service được xem là đáp ứng phạm vi ban đầu khi:

- Tạo booking thành công ở trạng thái `CONFIRMED`.
- Snapshot dịch vụ được lưu đúng thứ tự và không phụ thuộc vào dữ liệu Catalog thay đổi về sau.
- Thời lượng booking bằng tổng thời lượng các dịch vụ nối tiếp.
- Thuật toán kiểm tra đủ nhân sự trên toàn bộ khoảng booking, không chỉ tại thời điểm bắt đầu.
- Nguồn cung được lấy từ lịch tổng hợp của Staff Service và không bị đếm trùng nhân viên.
- Booking đã hủy hoặc không còn giữ sức chứa không tiếp tục làm tăng tải.
- Không thể vượt sức chứa do hai yêu cầu đặt lịch đồng thời.
- Đổi lịch không làm mất lịch cũ khi lịch mới không đặt được.
- Quy trình tiếp nhận không tạo trùng Vehicle hoặc Work Order khi retry.
- API và chuyển trạng thái được kiểm tra bằng các bài kiểm thử nghiệp vụ và tích hợp tương ứng.
