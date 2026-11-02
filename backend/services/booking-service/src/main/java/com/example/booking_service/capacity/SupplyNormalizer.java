package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Chuẩn hóa nguồn cung (PLAN §5.4): cắt về {@code [from, to)}, và với từng nhân viên
 * gộp các khoảng chồng lấn hoặc tiếp giáp để một người không bị đếm hai lần.
 */
public final class SupplyNormalizer {

    private SupplyNormalizer() {
    }

    public static List<SupplyInterval> normalize(Collection<SupplyInterval> raw, Instant from, Instant to) {
        Map<UUID, List<SupplyInterval>> byStaff = new LinkedHashMap<>();
        for (SupplyInterval interval : raw) {
            Instant start = interval.start().isBefore(from) ? from : interval.start();
            Instant end = interval.end().isAfter(to) ? to : interval.end();
            if (start.isBefore(end)) {
                byStaff.computeIfAbsent(interval.staffId(), id -> new ArrayList<>())
                        .add(new SupplyInterval(interval.staffId(), start, end));
            }
        }

        List<SupplyInterval> result = new ArrayList<>();
        for (Map.Entry<UUID, List<SupplyInterval>> entry : byStaff.entrySet()) {
            List<SupplyInterval> sorted = entry.getValue().stream()
                    .sorted(Comparator.comparing(SupplyInterval::start).thenComparing(SupplyInterval::end))
                    .toList();
            Instant currentStart = sorted.get(0).start();
            Instant currentEnd = sorted.get(0).end();
            for (int i = 1; i < sorted.size(); i++) {
                SupplyInterval next = sorted.get(i);
                if (next.start().isAfter(currentEnd)) {
                    result.add(new SupplyInterval(entry.getKey(), currentStart, currentEnd));
                    currentStart = next.start();
                    currentEnd = next.end();
                } else if (next.end().isAfter(currentEnd)) {
                    currentEnd = next.end();
                }
            }
            result.add(new SupplyInterval(entry.getKey(), currentStart, currentEnd));
        }
        return List.copyOf(result);
    }
}
