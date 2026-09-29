package com.optimize.elykia.core.entity.customer;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "customer_activity_log")
@Getter
@Setter
@NoArgsConstructor
public class CustomerActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID eventId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "client_id")
    private Long clientId;

    @Column(length = 30)
    private String phone;

    @Column(name = "device_id", length = 64)
    private String deviceId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(length = 20)
    private String platform;

    @Column(name = "app_version", length = 40)
    private String appVersion;

    @Column(length = 200)
    private String screen;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(length = 1000)
    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(length = 64)
    private String ip;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @PrePersist
    void onCreate() {
        if (eventId == null) {
            eventId = UUID.randomUUID();
        }
        if (receivedAt == null) {
            receivedAt = Instant.now();
        }
        if (occurredAt == null) {
            occurredAt = receivedAt;
        }
    }
}
