package com.optimize.common.securities.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "user_authorized_device", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "user_id", "device_id" })
})
public class UserAuthorizedDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "USEID", nullable = false)
    private User user;

    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId;

    @Column(name = "device_label", length = 255)
    private String deviceLabel;

    @Column(length = 32)
    private String platform;

    @Column(length = 128)
    private String model;

    @Column(name = "app_version", length = 32)
    private String appVersion;

    @Column(name = "registered_at", nullable = false)
    private Instant registeredAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "registered_by", nullable = false, length = 80)
    private String registeredBy = "SYSTEM";
}
