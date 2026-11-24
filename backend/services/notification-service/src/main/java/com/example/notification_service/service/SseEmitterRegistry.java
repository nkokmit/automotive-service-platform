package com.example.notification_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
public class SseEmitterRegistry {

    private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID recipientId) {
        if (recipientId == null) {
            throw new IllegalArgumentException("recipientId must not be null");
        }

        SseEmitter emitter = new SseEmitter(0L);
        emitters.compute(recipientId, (id, current) -> {
            CopyOnWriteArrayList<SseEmitter> connections =
                    current == null ? new CopyOnWriteArrayList<>() : current;
            connections.add(emitter);
            return connections;
        });

        emitter.onCompletion(() -> removeEmitter(recipientId, emitter));
        emitter.onTimeout(() -> {
            removeEmitter(recipientId, emitter);
            emitter.complete();
        });
        emitter.onError(error -> removeEmitter(recipientId, emitter));
        return emitter;
    }

    public void publish(UUID recipientId, NotificationSsePayload notification) {
        CopyOnWriteArrayList<SseEmitter> connections = emitters.get(recipientId);
        if (connections == null) {
            return;
        }

        for (SseEmitter emitter : connections) {
            try {
                emitter.send(SseEmitter.event()
                        .id(notification.id().toString())
                        .name("notification")
                        .data(notification, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException exception) {
                log.debug("Removing failed SSE connection for recipient {}", recipientId, exception);
                removeEmitter(recipientId, emitter);
            }
        }
    }

    private void removeEmitter(UUID recipientId, SseEmitter emitter) {
        emitters.computeIfPresent(recipientId, (id, connections) -> {
            connections.remove(emitter);
            return connections.isEmpty() ? null : connections;
        });
    }
}
