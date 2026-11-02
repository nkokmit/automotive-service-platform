# Giải thích thuật toán tính Capacity

Tài liệu này tổng hợp nội dung đã trao đổi về cách Booking Service dựng và kiểm tra sức chứa kỹ thuật viên bằng Sweep Line.

## 1. Ý tưởng tổng quát

Booking Service phải đảm bảo:

```text
tổng nhu cầu kỹ thuật viên <= tổng nhân viên đang làm việc
```

trên **mọi khoảng thời gian** của booking mới, không chỉ tại thời điểm bắt đầu.

Thuật toán phải tính:

- nhu cầu thay đổi theo từng dịch vụ;
- nguồn cung thay đổi theo ca làm việc;
- tải từ các booking hiện có;
- phần giao nhau giữa các khoảng thời gian;
- các timestamp mà supply hoặc demand thay đổi.

Điều kiện cốt lõi là:

```text
currentDemand <= currentSupply
```

đối với mọi đoạn thời gian kiểm tra trong `[reqStart, reqEnd)`.

---

## 2. Nguồn cung và nhu cầu là hai loại dữ liệu khác nhau

### Nguồn cung

Nguồn cung đến từ lịch làm việc thực tế của Staff Service.

Ví dụ:

| Kỹ thuật viên | Khoảng làm việc |
|---|---|
| NV1 | 08:00-12:00 |
| NV2 | 08:00-17:00 |
| NV3 | 09:00-17:00 |

Mỗi khoảng làm việc được chuyển thành:

```text
At shiftStart: supply +1
At shiftEnd:   supply -1
```

Booking Service không tự dựng lại lịch định kỳ, ngoại lệ hoặc nghỉ phép từ quy tắc Staff Service. Dữ liệu cung này phải là lịch tổng hợp được Staff Service trả về.

### Nhu cầu

Nhu cầu đến từ:

- booking mới đang cần kiểm tra;
- các booking hiện có còn giữ sức chứa.

Mỗi khoảng dịch vụ đóng góp:

```text
At serviceStart: demand +requiredTechnicians
At serviceEnd:   demand -requiredTechnicians
```

---

## 3. Dựng chuỗi dịch vụ của booking mới

Booking mới ban đầu có danh sách dịch vụ theo thứ tự:

```text
[Dịch vụ 1, Dịch vụ 2, Dịch vụ 3]
```

Booking Service lấy snapshot thời lượng và số kỹ thuật viên cần thiết từ Inventory Service:

```text
Dịch vụ 1: 30 phút, cần 1 kỹ thuật viên
Dịch vụ 2: 60 phút, cần 3 kỹ thuật viên
Dịch vụ 3: 30 phút, cần 2 kỹ thuật viên
```

Các dữ liệu này được dùng để tạo danh sách `ServiceSlot`.

### Ví dụ

Booking bắt đầu lúc 08:00:

```text
Dịch vụ 1 bắt đầu: 08:00
Dịch vụ 1 kết thúc: 08:30

Dịch vụ 2 bắt đầu: 08:30
Dịch vụ 2 kết thúc: 09:30

Dịch vụ 3 bắt đầu: 09:30
Dịch vụ 3 kết thúc: 10:00
```

Kết quả Demand của booking mới:

| Khoảng | Số kỹ thuật viên cần |
|---|---:|
| 08:00-08:30 | 1 |
| 08:30-09:30 | 3 |
| 09:30-10:00 | 2 |

Mã logic tương đương:

```java
cursor = bookingStart;

for (ServiceSlot slot : slots) {
    Instant end = cursor.plus(
        Duration.ofMinutes(slot.durationMinutes())
    );

    DemandInterval interval = new DemandInterval(
        cursor,
        end,
        slot.requiredTechnicians()
    );

    cursor = end;
}
```

`cursor` là thời điểm bắt đầu của dịch vụ tiếp theo. Sau khi dịch vụ kết thúc, nó được cập nhật để dịch vụ kế tiếp bắt đầu ngay sau đó.

Không được lấy `max(requiredTechnicians)` cho toàn booking. Ví dụ trên không thể coi booking luôn cần 3 kỹ thuật viên trong suốt khoảng 08:00-10:00.

`reqEnd` là thời điểm kết thúc của dịch vụ cuối:

```text
reqEnd = 08:00 + 30 + 60 + 30 = 10:00
```

Implementation của booking mới nằm tại `SequentialDemandBuilder`.

---

## 4. Booking mới có phải được lưu trước khi tính Demand không?

Không.

Booking mới được đưa vào thuật toán như một booking giả định:

```text
existingDemand
+ demand giả định của booking mới
```

Chỉ khi kiểm tra đạt điều kiện đủ sức chứa trên toàn bộ khoảng thì Booking Service mới lưu:

- booking mới;
- các dòng `booking_services`.

Nếu thất bại, booking mới không được ghi.

---

## 5. Chuẩn hóa nguồn cung Staff Service

Staff Service có thể trả nhiều khoảng làm việc cho cùng một nhân viên.

Ví dụ khoảng chồng lấn:

```text
NV1: 08:00-10:00
NV1: 09:00-12:00
```

Sau chuẩn hóa, khoảng của NV1 là:

```text
08:00-12:00
```

Không được đếm NV1 là hai người trong khoảng 09:00-10:00.

Ví dụ khoảng tiếp giáp:

```text
NV1: 08:00-12:00
NV1: 12:00-17:00
```

có thể gộp thành:

```text
NV1: 08:00-17:00
```

`SupplyNormalizer` cũng cắt các khoảng về `[reqStart, reqEnd)`.

Ví dụ booking kiểm tra từ 09:30 đến 11:00, nhân viên làm việc từ 09:00 đến 12:00 thì sau cắt chỉ còn:

```text
09:30-11:00
```

Từng khoảng nhân viên chuẩn hóa đóng góp `+1` tại thời điểm bắt đầu và `-1` tại thời điểm kết thúc.

---

## 6. Tái dựng Demand của booking hiện có

Booking hiện có được truy vấn nếu khoảng của nó giao với `[reqStart, reqEnd)`.

Một booking bắt đầu trước `reqStart` nhưng kết thúc sau `reqStart` vẫn chiếm nhân lực và vẫn phải được tính.

Chỉ các booking ở trạng thái giữ sức chứa được tính:

```text
CONFIRMED
CHECKED_IN
```

Các booking đã hủy hoặc không còn giữ sức chứa không được tính.

Đối với mỗi booking hiện có:

1. Đọc `startAt` thực tế.
2. Đọc các dòng dịch vụ theo `sequenceNumber`.
3. Dựng chuỗi dịch vụ từ `startAt`, không phải từ `reqStart`.
4. Mỗi dịch vụ dùng `requiredTechniciansSnapshot`.
5. Cắt hoặc loại các khoảng không giao với cửa sổ kiểm tra.

### Ví dụ

Booking hiện có bắt đầu lúc 08:15:

| Dịch vụ | Khoảng thực hiện | Demand |
|---|---|---:|
| Thay dầu | 08:15-08:45 | 1 |
| Sửa phanh | 08:45-09:45 | 3 |

Nếu cửa sổ kiểm tra là `08:30-09:30`, phần cần tính là:

```text
08:30-08:45: demand 1
08:45-09:30: demand 3
```

Không được dựng lại chuỗi từ 08:30. Phải cộng dồn từ thời điểm thực tế 08:15.

Implementation của booking hiện có nằm tại `ExistingDemandReconstructor`.

---

## 7. Tạo timeline sự kiện

Sau khi có:

- danh sách nguồn cung;
- Demand của booking hiện có;
- Demand giả định của booking mới.

Booking Service tạo timeline:

```text
timestamp -> tổng thay đổi Supply
timestamp -> tổng thay đổi Demand
```

Ví dụ Supply:

```text
08:00: supply +2
12:00: supply -2
```

Ví dụ Demand booking mới:

```text
08:00: demand +1
08:30: demand -1
08:30: demand +3
09:30: demand -3
09:30: demand +2
10:00: demand -2
```

Tại cùng một timestamp, các thay đổi được cộng dồn:

```text
08:30:
-1 + 3 = +2
```

---

## 8. Thuật toán Sweep Line

Sweep Line duyệt các timestamp theo thứ tự tăng dần.
>> Xem SWEEPLINE_EXPLANATION.md

### Bước khởi tạo

```text
currentSupply = 0
currentDemand = 0
```

### Với mỗi timestamp t

1. Áp dụng mọi thay đổi supply tại `t`.
2. Áp dụng mọi thay đổi demand tại `t`.
3. Tìm timestamp tiếp theo `nextT`.
4. Kiểm tra đoạn `[t, nextT)`:

```text
currentDemand <= currentSupply
```

Không cần kiểm tra từng phút. Giữa hai timestamp liên tiếp, supply và demand không thay đổi.

### Ví dụ timeline

```text
08:00-08:30: supply = 4, demand = 2
08:30-09:00: supply = 4, demand = 4
09:00-09:30: supply = 3, demand = 4
```

Các kết quả:

| Khoảng | Demand | Supply | Kết quả |
|---|---:|---:|---|
| 08:00-08:30 | 2 | 4 | Đủ |
| 08:30-09:00 | 4 | 4 | Đủ |
| 09:00-09:30 | 4 | 3 | Thiếu |

Booking bị từ chối vì có ít nhất một đoạn vi phạm:

```text
4 > 3
```

Implementation chính nằm tại:

- `CapacitySweepLineCalculator`
- `CapacityCheckResult`
- `CapacityDeficit`

---

## 9. Gộp các sự kiện cùng timestamp

Các sự kiện cùng timestamp không được xử lý theo thứ tự riêng lẻ.

Ví dụ lúc 08:30 có:

```text
Dịch vụ cũ kết thúc: demand -1
Dịch vụ mới bắt đầu: demand +3
Ca NV1 kết thúc:     supply -1
Ca NV2 bắt đầu:      supply +1
```

Thuật toán cộng toàn bộ delta:

```text
demandDelta = -1 + 3 = +2
supplyDelta = -1 + 1 = 0
```

Sau đó mới chuyển sang trạng thái của đoạn tiếp theo.

Cách này tránh lỗi phụ thuộc thứ tự:

- nếu xử lý `supply -1` trước `supply +1`, có thể thấy thiếu nhân lực giả;
- nếu xử lý demand theo thứ tự sai, có thể thấy một khoảng thiếu ngắn không tồn tại.

Khoảng thời gian là nửa mở `[start, end)`:

```text
Ca kết thúc tại 08:00 không còn hiệu lực từ 08:00
Ca bắt đầu tại 08:00 có hiệu lực từ 08:00
```

---

## 10. Ví dụ booking hiện có bắt đầu 08:15

Booking mới có các dịch vụ:

```text
08:00-08:30: cần 2 kỹ thuật viên
08:30-09:15: cần 1 kỹ thuật viên
```

Booking hiện có bắt đầu lúc 08:15 và dùng 3 kỹ thuật viên liên tục đến 09:45:

```text
08:15-09:45: demand cũ = 3
```

Giả sử supply là 4 kỹ thuật viên.

Sweep Line tạo các timestamp:

```text
08:00: booking mới bắt đầu
08:15: booking cũ bắt đầu
08:30: booking mới đổi từ 2 sang 1 kỹ thuật viên
09:15: dịch vụ cuối của booking mới kết thúc
09:45: booking cũ kết thúc
```

Kết quả từng đoạn:

| Khoảng | Demand booking cũ | Demand booking mới | Demand tổng | Supply | Kết quả |
|---|---:|---:|---:|---:|---|
| 08:00-08:15 | 0 | 2 | 2 | 4 | Đủ |
| 08:15-08:30 | 3 | 2 | 5 | 4 | Thiếu |
| 08:30-09:15 | 3 | 1 | 4 | 4 | Đủ |
| 09:15-09:45 | 3 | 0 | 3 | 4 | Đủ |

Booking mới bị từ chối vì tại đoạn:

```text
08:15-08:30
```

điều kiện là:

```text
demand = 5
supply = 4
5 > 4
```

Mặc dù đoạn 08:00-08:15 và đoạn 08:30-09:45 đủ, booking vẫn không khả thi vì thuật toán yêu cầu mọi đoạn đều đủ sức chứa.

---

## 11. Cắt khoảng theo cửa sổ kiểm tra

Nếu demand của booking cũ bắt đầu trước `reqStart`, Sweep Line không bắt đầu cây chuỗi lại từ `reqStart`.

Ví dụ booking cũ bắt đầu lúc 08:15 và cửa sổ kiểm tra là 08:30-09:30:

```text
Dữ liệu gốc: 08:15-09:45
Sau cắt:     08:30-09:45
```

Nhưng chuỗi dịch vụ của booking vẫn được dựng từ 08:15 để xác định:

```text
08:30 đang ở dịch vụ nào?
Dịch vụ đó cần bao nhiêu kỹ thuật viên?
```

Sau khi xác định đúng demand, thời gian ngoài cửa sổ mới được cắt bỏ.

---

## 12. Trường hợp booking cũ nhiều dịch vụ

Booking cũ không được giả định luôn giữ cùng một mức demand cho đến khi kết thúc.

Ví dụ booking cũ bắt đầu 08:15:

```text
08:15-08:45: thay dầu, cần 1 kỹ thuật viên
08:45-09:45: sửa phanh, cần 3 kỹ thuật viên
```

Cửa sổ booking mới là 08:30-09:30.

Các khoảng booking cũ giao với cửa sổ là:

```text
08:30-08:45: demand = 1
08:45-09:30: demand = 3
09:30-09:45: demand = 3
```

Khoảng sau 09:30 nằm ngoài cửa sổ booking mới nhưng vẫn có thể là timestamp ảnh hưởng đến dữ liệu nếu cửa sổ rộng hơn hoặc phần booking mới kéo dài.

Không được chỉ lấy phần `max` hoặc `min`; mỗi dịch vụ tạo một khoảng demand riêng.

---

## 13. Phân biệt các loại lỗi

### Không đủ sức chứa

Đây là kết quả nghiệp vụ hợp lệ:

```text
currentDemand > currentSupply
```

Kết quả chứa danh sách `CapacityDeficit`, gồm:

```text
start       timestamp bắt đầu thiếu nhân sự
end         timestamp kết thúc đoạn thiếu
demand      tổng nhu cầu
supply      tổng nguồn cung
```

### Lỗi Inventory/Staff Service

Lỗi tích hợp không được diễn giải thành:

```text
supply = 0
```

hoặc booking tự động bị từ chối.

Nếu không xác minh được dữ liệu thời lượng, kỹ thuật viên hoặc lịch làm việc, hệ thống phải ném lỗi integration service unavailable theo quy ước hiện có.

---

## 14. Luồng xử lý đầy đủ trong Booking Service

```text
Nhận booking mới start + serviceIds
    |
    v
Resolve serviceIds qua Inventory Service
    |
    v
Dựng demand mới theo chuỗi nối tiếp
    |
    v
Xác định reqEnd = end dịch vụ cuối
    |
    v
Lấy lịch làm việc trong [reqStart, reqEnd)
    |
    v
Chuẩn hóa Supply theo từng nhân viên
    |
    v
Truy vấn booking đang giữ sức chứa
    |
    v
Tái dựng Demand của booking hiện có
    |
    v
Cắt khoảng về cửa sổ kiểm tra
    |
    v
Tạo supply/demand events
    |
    v
Gộp sự kiện tại cùng timestamp
    |
    v
Sweep từng đoạn [start, nextTimestamp)
    |
    +-- Có demand > supply -> không khả thi
    |
    +-- Mọi đoạn đều demand <= supply -> khả thi
```

---

## 15. Các edge case cần bảo vệ

### Booking qua ngày

Booking có thể bắt đầu ngày hôm trước và kết thúc sang ngày hôm sau.

Staff Service phải được truy vấn đủ các ngày giao với `[reqStart, reqEnd)`.

### Thời điểm tiếp giáp

Khoảng có chiều:

```text
[08:00, 08:30)
```

kết thúc chính xác tại 08:30 và không còn active tại 08:30.

### Kết thúc ca và bắt đầu ca cùng lúc

Các delta được cộng dồn, không xử lý theo thứ tự từng sự kiện:

```text
NV1 kết thúc ca: -1
NV2 bắt đầu ca:  +1
Kết quả delta:   0
```

### Không có sự kiện trong một khoảng

Nếu timeline không tạo timestamp mới, giá trị supply và demand được giữ nguyên trong toàn bộ đoạn giữa hai timestamp.

### Booking overlap booking mới

Booking hiện tại và booking mới giao nhau tại một số dịch vụ. Demand của cả hai được cộng thay vì chỉ tính booking nào dài hơn hoặc booking nào cần nhiều nhân viên hơn.

### Hai yêu cầu đặt đồng thời

Capacity check là kết quả tại một thời điểm. Việc tạo booking thật vẫn cần cơ chế đồng bộ database hoặc reservation để tránh hai request đều thấy slot khả dụng rồi cùng ghi booking và vượt sức chứa.

---

## 16. Tóm tắt trực quan

```text
booking mới
    ↓
chia thành các khoảng dịch vụ
    ↓
mỗi khoảng có requiredTechnicians riêng
    ↓
cộng tải của booking hiện có
    ↓
chuẩn hóa lịch làm việc Staff Service thành Supply
    ↓
tạo sự kiện tại mọi timestamp thay đổi
    ↓
gộp tất cả delta tại cùng timestamp
    ↓
kiểm tra Demand <= Supply trên từng đoạn
```

Kết quả cuối cùng:

- **Khả thi:** mọi đoạn đều thỏa `demand <= supply`.
- **Không khả thi:** có ít nhất một đoạn `demand > supply`.
