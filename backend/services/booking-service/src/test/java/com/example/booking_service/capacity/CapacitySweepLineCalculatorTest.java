package com.example.booking_service.capacity;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.example.booking_service.capacity.CapacityTestSupport.at;
import static com.example.booking_service.capacity.CapacityTestSupport.demand;
import static com.example.booking_service.capacity.CapacityTestSupport.nextDay;
import static com.example.booking_service.capacity.CapacityTestSupport.shift;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CapacitySweepLineCalculatorTest {

    private final UUID a = UUID.randomUUID();
    private final UUID b = UUID.randomUUID();
    private final UUID c = UUID.randomUUID();
    private final UUID d = UUID.randomUUID();

    private CapacityCheckResult check(Instant start, Instant end, List<SupplyInterval> supply,
                                      List<DemandInterval> existing, List<DemandInterval> fresh) {
        return CapacitySweepLineCalculator.check(start, end, supply, existing, fresh);
    }

    @Test
    void rejectsSlotWhenOnlyOneSegmentIsShort() {
        // Ví dụ PLAN §5.8: 09:00-09:30 cần 4 nhưng chỉ có 3 người.
        List<SupplyInterval> supply = List.of(
                shift(a, at(8, 0), at(9, 30)), shift(b, at(8, 0), at(9, 30)),
                shift(c, at(8, 0), at(9, 30)), shift(d, at(8, 0), at(9, 0)));
        List<DemandInterval> existing = List.of(
                demand(at(8, 0), at(8, 30), 2), demand(at(8, 30), at(9, 30), 1));
        List<DemandInterval> fresh = List.of(
                demand(at(8, 0), at(8, 30), 1), demand(at(8, 30), at(9, 30), 3));

        CapacityCheckResult result = check(at(8, 0), at(9, 30), supply, existing, fresh);

        assertFalse(result.feasible());
        assertEquals(1, result.deficits().size());
        CapacityDeficit deficit = result.deficits().get(0);
        assertEquals(at(9, 0), deficit.start());
        assertEquals(at(9, 30), deficit.end());
        assertEquals(4, deficit.demand());
        assertEquals(3, deficit.supply());
    }

    @Test
    void doesNotApplyMaxTechniciansToWholeBooking() {
        // Tải cũ 2 chỉ ở đầu và cuối; nếu lấy max=3 cho cả booking sẽ thành 5 > 4 và bị từ chối nhầm.
        List<SupplyInterval> supply = List.of(
                shift(a, at(8, 0), at(10, 0)), shift(b, at(8, 0), at(10, 0)),
                shift(c, at(8, 0), at(10, 0)), shift(d, at(8, 0), at(10, 0)));
        List<DemandInterval> existing = List.of(
                demand(at(8, 0), at(8, 30), 2), demand(at(9, 30), at(9, 45), 2));
        List<DemandInterval> fresh = List.of(
                demand(at(8, 0), at(8, 30), 1), demand(at(8, 30), at(9, 30), 3),
                demand(at(9, 30), at(9, 45), 1));

        assertTrue(check(at(8, 0), at(9, 45), supply, existing, fresh).feasible());
    }

    @Test
    void adjacentShiftsOfDifferentStaffDoNotCreateFalseGap() {
        List<SupplyInterval> supply = List.of(
                shift(a, at(8, 0), at(12, 0)), shift(b, at(12, 0), at(17, 0)));
        List<DemandInterval> fresh = List.of(demand(at(10, 0), at(14, 0), 1));

        assertTrue(check(at(10, 0), at(14, 0), supply, List.of(), fresh).feasible());
    }

    @Test
    void breakInsideShiftIsReportedAsDeficit() {
        List<SupplyInterval> supply = List.of(
                shift(a, at(8, 0), at(10, 0)), shift(a, at(10, 30), at(17, 0)));
        List<DemandInterval> fresh = List.of(demand(at(9, 0), at(11, 0), 1));

        CapacityCheckResult result = check(at(9, 0), at(11, 0), supply, List.of(), fresh);

        assertFalse(result.feasible());
        assertEquals(at(10, 0), result.deficits().get(0).start());
        assertEquals(at(10, 30), result.deficits().get(0).end());
        assertEquals(0, result.deficits().get(0).supply());
    }

    @Test
    void existingBookingStartedBeforeWindowStillConsumesCapacity() {
        List<SupplyInterval> supply = List.of(shift(a, at(7, 0), at(10, 0)), shift(b, at(7, 0), at(10, 0)));
        List<DemandInterval> existing = List.of(demand(at(7, 0), at(9, 0), 2));
        List<DemandInterval> fresh = List.of(demand(at(8, 0), at(9, 0), 1));

        CapacityCheckResult result = check(at(8, 0), at(9, 0), supply, existing, fresh);

        assertFalse(result.feasible());
        assertEquals(at(8, 0), result.deficits().get(0).start());
    }

    @Test
    void existingBookingEndingExactlyAtWindowStartDoesNotCount() {
        List<SupplyInterval> supply = List.of(shift(a, at(7, 0), at(10, 0)));
        List<DemandInterval> existing = List.of(demand(at(7, 0), at(8, 0), 1));
        List<DemandInterval> fresh = List.of(demand(at(8, 0), at(9, 0), 1));

        assertTrue(check(at(8, 0), at(9, 0), supply, existing, fresh).feasible());
    }

    @Test
    void noSupplyMakesWholeWindowShort() {
        CapacityCheckResult result = check(at(8, 0), at(9, 0), List.of(), List.of(),
                List.of(demand(at(8, 0), at(9, 0), 1)));

        assertFalse(result.feasible());
        assertEquals(at(8, 0), result.deficits().get(0).start());
        assertEquals(at(9, 0), result.deficits().get(0).end());
    }

    @Test
    void bookingCrossingMidnightUsesFullInstants() {
        List<SupplyInterval> supply = List.of(shift(a, at(22, 0), nextDay(2, 0)));
        List<DemandInterval> fresh = List.of(demand(at(23, 30), nextDay(0, 30), 1));

        assertTrue(check(at(23, 30), nextDay(0, 30), supply, List.of(), fresh).feasible());
    }

    @Test
    void rejectsInvalidWindow() {
        assertThrows(IllegalArgumentException.class,
                () -> check(at(9, 0), at(9, 0), List.of(), List.of(), List.of()));
    }
}
