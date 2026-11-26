package com.example.work_order_service.repository;

import java.util.UUID;

public interface CompletedServiceLineProjection {

    UUID getWorkOrderId();

    String getSnapshotName();
}
