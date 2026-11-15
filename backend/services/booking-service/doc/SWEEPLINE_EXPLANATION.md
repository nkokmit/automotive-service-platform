# 1. Mục đích của class

Class này trả lời câu hỏi:

> Trong toàn bộ khoảng thời gian của booking đang muốn tạo, có lúc nào số kỹ thuật viên đang được yêu cầu lớn hơn số kỹ thuật viên đang làm việc không?

Ví dụ garage có các kỹ thuật viên làm việc:

```text
KTV A: 08:00 ───────────── 17:00
KTV B:       09:00 ─────── 12:00
```

Và đã có booking:

```text
Booking cũ: 09:30 ── 11:00, cần 2 KTV
Booking mới:        10:00 ── 11:30, cần 1 KTV
```

Thuật toán sẽ tạo một **timeline các mốc thời gian**, sau đó đi từ trái sang phải để tính:

```text
Supply hiện tại = bao nhiêu KTV đang làm việc
Demand hiện tại = bao nhiêu KTV đang bị các booking sử dụng
```

Nếu tại bất kỳ đoạn nào:

```text
Demand > Supply
```

thì đoạn đó bị **thiếu sức chứa** và booking mới không thể được chấp nhận.

---

# 2. Hai loại dữ liệu đầu vào

## `SupplyInterval`

Đại diện cho **một đơn vị kỹ thuật viên có mặt làm việc**.

Ví dụ:

```text
KTV A: [08:00, 17:00)
KTV B: [09:00, 12:00)
```

Mỗi `SupplyInterval` được thêm với số lượng `1`:

```java
addClipped(..., SUPPLY, ..., 1, reqStart, reqEnd);
```

Nếu có 3 kỹ thuật viên cùng làm việc trong khoảng 08:00–17:00, sau khi đưa vào timeline, supply sẽ là `3`.

> Theo thiết kế Booking Service, `SupplyInterval` phải được lấy từ `dailyShifts` của Staff Service và đã được xử lý nghỉ phép/ngoại lệ trước đó.

---

## `DemandInterval`

Đại diện cho **nhu cầu kỹ thuật viên của một công việc**.

Ví dụ booking có 2 dịch vụ tuần tự:

```text
Thay dầu:     08:00 ── 09:00, cần 1 KTV
Sửa động cơ:  09:00 ────── 11:00, cần 2 KTV
```

Thì demand là:

```text
[08:00, 09:00): 1
[09:00, 11:00): 2
```

Đây chính là điểm quan trọng trong PLAN: **không tính cả booking là cần 3 kỹ thuật viên trong toàn bộ thời gian**.

Mỗi service tạo demand riêng theo thời gian thực tế của nó.

---

# 3. Ý nghĩa các hằng số

```java
private static final int SUPPLY = 0;
private static final int DEMAND = 1;
```

`TreeMap` lưu:

```java
TreeMap<Instant, int[]> timeline;
```

Mỗi thời điểm có một mảng:

```text
int[0] = thay đổi supply
int[1] = thay đổi demand
```

Ví dụ tại 08:00:

```text
[+2, +1]
```

nghĩa là:

- Có thêm 2 kỹ thuật viên bắt đầu làm việc.
- Có thêm demand cần 1 kỹ thuật viên.

---

# 4. Kiểm tra cửa sổ thời gian

```java
if (reqStart == null || reqEnd == null || !reqStart.isBefore(reqEnd)) {
    throw new IllegalArgumentException("Cửa sổ kiểm tra phải có reqStart < reqEnd");
}
```

Yêu cầu:

```text
reqStart < reqEnd
```

Ví dụ hợp lệ:

```text
08:00 < 10:00
```

Không hợp lệ:

```text
08:00 == 08:00
10:00 > 08:00
```

`reqStart` và `reqEnd` chính là **khoảng thời gian mà Booking Service muốn kiểm tra**.

Ví dụ booking mới diễn ra từ:

```text
[10:00, 13:00)
```

thì không cần kiểm tra toàn bộ ngày. Thuật toán chỉ cần quan tâm đến cửa sổ:

```text
[10:00, 13:00)
```

---

# 5. Tại sao luôn thêm `reqStart` và `reqEnd`?

```java
TreeMap<Instant, int[]> timeline = new TreeMap<>();
timeline.computeIfAbsent(reqStart, key -> new int[2]);
timeline.computeIfAbsent(reqEnd, key -> new int[2]);
```

Đây là một chi tiết rất quan trọng.

Giả sử:

```text
Window cần kiểm tra: [10:00, 12:00)

KTV đang làm việc: [08:00, 17:00)
```

Sau khi cắt interval vào window:

```text
Supply: [10:00, 12:00)
```

Timeline có:

```text
10:00
12:00
```

Nhờ vậy thuật toán luôn kiểm tra đoạn:

```text
[10:00, 12:00)
```

Ngay cả khi bên trong không có sự kiện bắt đầu/kết thúc nào khác.

---

# 6. `addClipped()` – cắt interval theo cửa sổ

Đây là phần cốt lõi đầu tiên:

```java
Instant clippedStart = start.isBefore(windowStart) ? windowStart : start;
Instant clippedEnd = end.isAfter(windowEnd) ? windowEnd : end;
```

Nó thực hiện phép giao:

```text
Interval gốc ∩ Window cần kiểm tra
```

## Ví dụ 1: Interval nằm hoàn toàn trong window

```text
Window:    [10:00 ───────────── 14:00)
Supply:         [11:00 ── 13:00)
```

Sau khi cắt:

```text
[11:00, 13:00)
```

Không thay đổi.

---

## Ví dụ 2: Interval bắt đầu trước window

```text
Supply: [08:00 ───────────── 12:00)
Window:          [10:00 ──────── 14:00)
```

Phần giao là:

```text
[10:00, 12:00)
```

Đây là lý do comment nói:

> Khoảng đã bắt đầu từ trước `reqStart` trở thành khoảng bắt đầu đúng tại `reqStart`.

Nhờ đó `currentSupply` có thể bắt đầu từ `0`.

Bạn **không cần phải quét các sự kiện xảy ra trước `reqStart` để tính trạng thái ban đầu**.

---

## Ví dụ 3: Không giao nhau

```text
Supply: [08:00, 09:00)
Window:  [10:00, 12:00)
```

Sau khi cắt:

```text
clippedStart >= clippedEnd
```

nên:

```java
if (!clippedStart.isBefore(clippedEnd)) {
    return;
}
```

Interval này không ảnh hưởng đến việc kiểm tra và bị bỏ qua.

---

# 7. Biến interval thành các sự kiện

Đây là kỹ thuật Sweep Line:

```java
timeline.computeIfAbsent(clippedStart, key -> new int[2])[kind] += amount;
timeline.computeIfAbsent(clippedEnd, key -> new int[2])[kind] -= amount;
```

Một khoảng:

```text
[start, end)
```

được chuyển thành hai sự kiện:

```text
start: +amount
end:   -amount
```

Ví dụ một kỹ thuật viên:

```text
[08:00, 12:00)
```

trở thành:

```text
08:00: supply +1
12:00: supply -1
```

Một demand cần 2 kỹ thuật viên:

```text
[09:00, 11:00), technicians = 2
```

trở thành:

```text
09:00: demand +2
11:00: demand -2
```

Timeline:

| Thời điểm | Supply delta | Demand delta |
|---|---:|---:|
| 08:00 | +1 | 0 |
| 09:00 | 0 | +2 |
| 11:00 | 0 | -2 |
| 12:00 | -1 | 0 |

---

# 8. Tại sao dùng `TreeMap`?

```java
TreeMap<Instant, int[]> timeline;
```

`TreeMap` tự động sắp xếp các key theo thời gian.

Ví dụ các event được thêm không theo thứ tự:

```text
12:00
08:00
11:00
09:00
```

Sau đó `TreeMap` đảm bảo timeline là:

```text
08:00 → 09:00 → 11:00 → 12:00
```

Đây chính là thứ tự để Sweep Line "quét" từ quá khứ đến tương lai.

---

# 9. Tại sao phải cộng dồn các event cùng thời điểm?

Đoạn này:

```java
timeline.computeIfAbsent(time, key -> new int[2])[kind] += amount;
```

có nghĩa mọi thay đổi tại cùng một `Instant` được cộng vào cùng một mảng.

Ví dụ tại 10:00:

```text
KTV A kết thúc:       supply -1
KTV B bắt đầu:        supply +1
Booking cũ kết thúc:  demand -1
Booking mới bắt đầu:  demand +1
```

Sau khi cộng dồn:

```text
Supply delta = 0
Demand delta = 0
```

Trạng thái cho đoạn tiếp theo không thay đổi.

Điều này xử lý chính xác quy tắc **half-open interval**:

```text
[start, end)
```

Một ca kết thúc lúc 10:00 **không còn tồn tại sau 10:00**, trong khi ca khác bắt đầu lúc 10:00 **có hiệu lực từ 10:00**.

---

# 10. Vòng lặp Sweep Line chính

```java
List<Map.Entry<Instant, int[]>> points = new ArrayList<>(timeline.entrySet());
```

Ví dụ timeline:

```text
08:00 → 09:00 → 11:00 → 12:00
```

Sau đó:

```java
int currentSupply = 0;
int currentDemand = 0;
```

Ban đầu bằng `0` vì tất cả interval đã được cắt vào cửa sổ.

---

## Vòng lặp

```java
for (int i = 0; i < points.size() - 1; i++) {
```

Tại mỗi mốc thời gian, thuật toán:

### Bước 1: Áp dụng tất cả thay đổi tại mốc đó

```java
int[] delta = points.get(i).getValue();
currentSupply += delta[SUPPLY];
currentDemand += delta[DEMAND];
```

### Bước 2: Kiểm tra đoạn kế tiếp

```java
if (currentDemand > currentSupply)
```

Trạng thái sau khi áp dụng event tại `points[i]` sẽ có hiệu lực trên đoạn:

```text
[points[i], points[i + 1])
```

---

# 11. Ví dụ chạy từng bước

Giả sử:

### Supply

```text
KTV A: [08:00, 12:00)
KTV B: [09:00, 11:00)
```

### Existing demand

```text
Booking cũ: [09:30, 10:30), cần 2 KTV
```

### New demand

```text
Booking mới: [10:00, 11:30), cần 1 KTV
```

Timeline:

| Thời điểm | Δ Supply | Δ Demand |
|---|---:|---:|
| 08:00 | +1 | 0 |
| 09:00 | +1 | 0 |
| 09:30 | 0 | +2 |
| 10:00 | 0 | +1 |
| 10:30 | 0 | -2 |
| 11:00 | -1 | 0 |
| 11:30 | 0 | -1 |
| 12:00 | -1 | 0 |

Bây giờ quét:

### `[08:00, 09:00)`

```text
Supply = 1
Demand = 0
```

Đủ.

### `[09:00, 09:30)`

```text
Supply = 2
Demand = 0
```

Đủ.

### `[09:30, 10:00)`

```text
Supply = 2
Demand = 2
```

Đủ, vì:

```text
Demand <= Supply
```

### `[10:00, 10:30)`

Booking mới bắt đầu:

```text
Supply = 2
Demand = 3
```

Lúc này:

```text
3 > 2
```

=> Thiếu 1 kỹ thuật viên.

Thuật toán tạo:

```java
new CapacityDeficit(
    10:00,
    10:30,
    3,
    2
)
```

### `[10:30, 11:00)`

Booking cũ kết thúc:

```text
Supply = 2
Demand = 1
```

Đủ.

### `[11:00, 11:30)`

KTV B hết ca:

```text
Supply = 1
Demand = 1
```

Vẫn đủ.

Kết quả cuối cùng chỉ có một đoạn thiếu hụt:

```text
[10:00, 10:30): Demand 3, Supply 2
```

---

# 12. Vì sao không kiểm tra `reqEnd`?

Vòng lặp:

```java
i < points.size() - 1
```

cố ý bỏ điểm cuối cùng.

Ví dụ:

```text
10:00 → 11:00 → 12:00
```

Thuật toán kiểm tra:

```text
[10:00, 11:00)
[11:00, 12:00)
```

Sau `12:00` không còn đoạn nào thuộc cửa sổ cần kiểm tra.

Do đó comment:

```java
// Điểm cuối cùng là reqEnd: chỉ đóng đoạn, không mở đoạn mới.
```

là chính xác.

---

# 13. `CapacityCheckResult` trả về gì?

Cuối cùng:

```java
return new CapacityCheckResult(reqStart, reqEnd, deficits);
```

Kết quả không chỉ là `true/false`.

Nó giữ danh sách các đoạn bị thiếu:

```text
Window: [08:00, 12:00)

Deficits:
- [10:00, 10:30): demand=3, supply=2
```

Điều này tốt hơn boolean vì phía trên có thể:

- quyết định booking có khả dụng hay không;
- log nguyên nhân thiếu sức chứa;
- hiển thị khoảng thời gian không đủ kỹ thuật viên;
- phục vụ debug thuật toán.

---

# 14. Điểm quan trọng nhất: thuật toán này có đúng với PLAN của Booking Service không?

**Có. Về logic, implementation này phù hợp với thiết kế capacity mà bạn đã chọn.**

Nó đáp ứng các nguyên tắc quan trọng:

- **Supply** được tính từ các khoảng kỹ thuật viên thực sự làm việc.
- **Demand** được tính theo từng service interval, không tính toàn bộ booking như một khối.
- Sử dụng **half-open interval `[start, end)`**.
- Các event cùng timestamp được **cộng dồn trước khi kiểm tra đoạn tiếp theo**.
- Interval được **cắt về cửa sổ yêu cầu**, nên không cần tính trạng thái từ trước `reqStart`.
- Kiểm tra toàn bộ timeline, không chỉ kiểm tra tổng số kỹ thuật viên hoặc `max(requiredTechs)`.

### Tóm gọn bằng một công thức

Ở mỗi đoạn thời gian giữa hai event liên tiếp:

```text
Available ⇔ Total Demand ≤ Total Supply
```

Nếu tồn tại bất kỳ đoạn nào:

```text
Total Demand > Total Supply
```

thì booking mới **không khả dụng về mặt sức chứa kỹ thuật viên**.

Điểm quan trọng của implementation này là cách **clip toàn bộ interval về `[reqStart, reqEnd)`**. Nó làm thuật toán đơn giản và tránh một lỗi Sweep Line phổ biến: quên tính các ca hoặc booking đã bắt đầu trước cửa sổ kiểm tra nhưng vẫn còn hiệu lực bên trong cửa sổ.