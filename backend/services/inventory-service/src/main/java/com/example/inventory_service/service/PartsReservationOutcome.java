package com.example.inventory_service.service;

import com.example.inventory_service.messaging.event.PartsReservationFailedEvent;
import com.example.inventory_service.messaging.event.PartsReservedEvent;

public sealed interface PartsReservationOutcome {

    record Reserved(PartsReservedEvent event) implements PartsReservationOutcome {
    }

    record Failed(PartsReservationFailedEvent event) implements PartsReservationOutcome {
    }
}
