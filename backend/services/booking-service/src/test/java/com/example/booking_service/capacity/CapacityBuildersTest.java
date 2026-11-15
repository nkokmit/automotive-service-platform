package com.example.booking_service.capacity;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static com.example.booking_service.capacity.CapacityTestSupport.at;
import static com.example.booking_service.capacity.CapacityTestSupport.shift;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CapacityBuildersTest {

    private ServiceSlot slot(int minutes, int technicians) {
        return new ServiceSlot(UUID.randomUUID(), "svc", minutes, technicians);
    }

    @Test
    void buildsConsecutiveIntervalsWithPerServiceDemand() {
        List<DemandInterval> intervals = SequentialDemandBuilder.build(
                at(8, 0), List.of(slot(30, 1), slot(60, 3), slot(15, 1)));

        assertEquals(3, intervals.size());
        assertEquals(new DemandInterval(at(8, 0), at(8, 30), 1), intervals.get(0));
        assertEquals(new DemandInterval(at(8, 30), at(9, 30), 3), intervals.get(1));
        assertEquals(new DemandInterval(at(9, 30), at(9, 45), 1), intervals.get(2));
    }

    @Test
    void rejectsEmptyOrInvalidServices() {
        assertThrows(ApiException.class, () -> SequentialDemandBuilder.build(at(8, 0), List.of()));
        assertThrows(ApiException.class, () -> SequentialDemandBuilder.build(at(8, 0), List.of(slot(0, 1))));
        assertThrows(ApiException.class, () -> SequentialDemandBuilder.build(at(8, 0), List.of(slot(30, 0))));
        assertThrows(ApiException.class, () -> SequentialDemandBuilder.build(null, List.of(slot(30, 1))));
    }

    @Test
    void mergesAdjacentAndOverlappingIntervalsOfSameStaff() {
        UUID staff = UUID.randomUUID();
        List<SupplyInterval> result = SupplyNormalizer.normalize(List.of(
                shift(staff, at(8, 0), at(12, 0)), shift(staff, at(12, 0), at(17, 0)),
                shift(staff, at(16, 0), at(18, 0))), at(0, 0), at(23, 0));

        assertEquals(List.of(shift(staff, at(8, 0), at(18, 0))), result);
    }

    @Test
    void keepsSeparateStaffAndSeparateGapsApart() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        List<SupplyInterval> result = SupplyNormalizer.normalize(List.of(
                shift(first, at(8, 0), at(10, 0)), shift(first, at(11, 0), at(12, 0)),
                shift(second, at(8, 0), at(10, 0))), at(0, 0), at(23, 0));

        assertEquals(3, result.size());
    }

    @Test
    void clipsSupplyToWindowAndDropsOutsideIntervals() {
        UUID staff = UUID.randomUUID();
        List<SupplyInterval> result = SupplyNormalizer.normalize(List.of(
                shift(staff, at(6, 0), at(9, 0)), shift(staff, at(20, 0), at(22, 0))), at(8, 0), at(10, 0));

        assertEquals(List.of(shift(staff, at(8, 0), at(9, 0))), result);
    }

    @Test
    void reconstructsExistingBookingFromItsOwnStartTime() {
        Booking booking = Booking.builder().id(UUID.randomUUID()).startAt(at(8, 15)).build();
        List<BookingService> lines = List.of(
                line(booking, 2, 60, 3), line(booking, 1, 30, 1));

        List<DemandInterval> result = ExistingDemandReconstructor.reconstruct(List.of(booking), lines);

        assertEquals(List.of(
                new DemandInterval(at(8, 15), at(8, 45), 1),
                new DemandInterval(at(8, 45), at(9, 45), 3)), result);
    }

    @Test
    void failsLoudlyWhenBookingHasNoServiceLines() {
        Booking booking = Booking.builder().id(UUID.randomUUID()).startAt(at(8, 0)).build();

        assertThrows(IllegalStateException.class,
                () -> ExistingDemandReconstructor.reconstruct(List.of(booking), List.of()));
    }

    private BookingService line(Booking booking, int sequence, int minutes, int technicians) {
        return BookingService.builder()
                .booking(booking).serviceId(UUID.randomUUID()).serviceNameSnapshot("svc")
                .sequenceNumber(sequence).estimatedDurationMinutes(minutes)
                .requiredTechniciansSnapshot(technicians).build();
    }
}
