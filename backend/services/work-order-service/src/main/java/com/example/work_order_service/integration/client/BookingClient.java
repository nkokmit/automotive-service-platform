package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        name = "booking-service",
        url = "${app.integration.booking-service-url:http://localhost:8085}",
        configuration = BookingClientConfig.class
)
public interface BookingClient {

    @GetMapping("/api/staff/bookings/{bookingId}")
    ServiceApiResponse<BookingContract> getBooking(@PathVariable UUID bookingId);
}
