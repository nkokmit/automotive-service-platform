package com.example.booking_service.service;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingStatusHistory;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.repository.BookingStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingStatusHistoryServiceImpl implements BookingStatusHistoryService {

    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;

    @Override
    @Transactional
    public void recordInitialStatus(Booking booking, UUID changedBy, String reason) {
        if (booking == null || booking.getId() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Booking phải được lưu trước khi ghi lịch sử trạng thái");
        }
        BookingStatus toStatus = booking.getStatus();
        if (toStatus == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Booking phải có trạng thái ban đầu");
        }
        saveHistory(booking, null, toStatus, changedBy, reason);
    }

    @Override
    @Transactional
    public void recordTransition(
            Booking booking,
            BookingStatus fromStatus,
            BookingStatus toStatus,
            UUID changedBy,
            String reason
    ) {
        if (booking == null || booking.getId() == null || fromStatus == null || toStatus == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Thông tin chuyển trạng thái booking không hợp lệ");
        }
        if (fromStatus == toStatus) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Không thể ghi chuyển trạng thái giống nhau");
        }
        booking.setStatus(toStatus);
        saveHistory(booking, fromStatus, toStatus, changedBy, reason);
    }

    private void saveHistory(
            Booking booking,
            BookingStatus fromStatus,
            BookingStatus toStatus,
            UUID changedBy,
            String reason
    ) {
        BookingStatusHistory history = BookingStatusHistory.builder()
                .booking(booking)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedAt(Instant.now())
                .reason(reason)
                .changedBy(changedBy)
                .build();
        bookingStatusHistoryRepository.save(history);
    }
}
