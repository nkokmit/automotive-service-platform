package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Sweep Line kiểm tra {@code demand <= supply} trên toàn bộ {@code [reqStart, reqEnd)}
 * (PLAN §5.6 - §5.8).
 *
 * <p>Chiến lược cắt nhất quán (PLAN §5.9, cách 1): mọi khoảng cung/cầu bị cắt về
 * {@code [reqStart, reqEnd)} trước, nên không còn sự kiện nào trước {@code reqStart} và
 * trạng thái ban đầu bằng 0. Khoảng đã bắt đầu từ trước {@code reqStart} trở thành khoảng
 * bắt đầu đúng tại {@code reqStart}. {@code reqStart}/{@code reqEnd} luôn là mốc của
 * timeline nên mọi đoạn trong cửa sổ đều được kiểm tra, kể cả khi không có sự kiện nào.
 *
 * <p>Mọi sự kiện cùng timestamp được cộng dồn rồi mới kiểm tra đoạn kế tiếp, nên ca
 * kết thúc đúng lúc ca khác bắt đầu không tạo thiếu hụt giả. Supply truyền vào phải đã
 * qua {@link SupplyNormalizer}.
 */
public final class CapacitySweepLineCalculator {

    private static final int SUPPLY = 0;
    private static final int DEMAND = 1;

    private CapacitySweepLineCalculator() {
    }

    public static CapacityCheckResult check(
            Instant reqStart,
            Instant reqEnd,
            Collection<SupplyInterval> supply,
            Collection<DemandInterval> existingDemand,
            Collection<DemandInterval> newDemand
    ) {
        if (reqStart == null || reqEnd == null || !reqStart.isBefore(reqEnd)) {
            throw new IllegalArgumentException("Cửa sổ kiểm tra phải có reqStart < reqEnd");
        }

        TreeMap<Instant, int[]> timeline = new TreeMap<>();
        timeline.computeIfAbsent(reqStart, key -> new int[2]);
        timeline.computeIfAbsent(reqEnd, key -> new int[2]);

        for (SupplyInterval interval : supply) {
            addClipped(timeline, SUPPLY, interval.start(), interval.end(), 1, reqStart, reqEnd);
        }
        for (DemandInterval interval : existingDemand) {
            addClipped(timeline, DEMAND, interval.start(), interval.end(), interval.technicians(), reqStart, reqEnd);
        }
        for (DemandInterval interval : newDemand) {
            addClipped(timeline, DEMAND, interval.start(), interval.end(), interval.technicians(), reqStart, reqEnd);
        }

        List<Map.Entry<Instant, int[]>> points = new ArrayList<>(timeline.entrySet());
        List<CapacityDeficit> deficits = new ArrayList<>();
        int currentSupply = 0;
        int currentDemand = 0;
        // Điểm cuối cùng là reqEnd: chỉ đóng đoạn, không mở đoạn mới.
        for (int i = 0; i < points.size() - 1; i++) {
            int[] delta = points.get(i).getValue();
            currentSupply += delta[SUPPLY];
            currentDemand += delta[DEMAND];
            if (currentDemand > currentSupply) {
                deficits.add(new CapacityDeficit(
                        points.get(i).getKey(), points.get(i + 1).getKey(), currentDemand, currentSupply));
            }
        }
        return new CapacityCheckResult(reqStart, reqEnd, deficits);
    }

    private static void addClipped(
            TreeMap<Instant, int[]> timeline,
            int kind,
            Instant start,
            Instant end,
            int amount,
            Instant windowStart,
            Instant windowEnd
    ) {
        Instant clippedStart = start.isBefore(windowStart) ? windowStart : start;
        Instant clippedEnd = end.isAfter(windowEnd) ? windowEnd : end;
        if (!clippedStart.isBefore(clippedEnd)) {
            return;
        }
        timeline.computeIfAbsent(clippedStart, key -> new int[2])[kind] += amount;
        timeline.computeIfAbsent(clippedEnd, key -> new int[2])[kind] -= amount;
    }
}
