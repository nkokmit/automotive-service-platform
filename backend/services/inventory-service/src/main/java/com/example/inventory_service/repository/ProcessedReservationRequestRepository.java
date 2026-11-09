package com.example.inventory_service.repository;

import com.example.inventory_service.entity.ProcessedReservationRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedReservationRequestRepository
        extends JpaRepository<ProcessedReservationRequest, UUID> {
}
