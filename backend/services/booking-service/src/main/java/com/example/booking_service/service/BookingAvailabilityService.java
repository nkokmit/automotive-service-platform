package com.example.booking_service.service;

import com.example.booking_service.dto.response.AvailabilitySlotResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BookingAvailabilityService {

    List<AvailabilitySlotResponse> findAvailable(LocalDate from, LocalDate to, List<UUID> serviceIds);
}
