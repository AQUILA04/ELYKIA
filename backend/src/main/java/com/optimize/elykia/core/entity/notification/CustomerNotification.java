package com.optimize.elykia.core.entity.notification;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.CustomerNotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_notification")
@Getter
@Setter
@NoArgsConstructor
public class CustomerNotification extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CustomerNotificationType type;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "entity_reference")
    private String entityReference;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private Double amount;

    @Column(name = "operation_date")
    private LocalDate operationDate;

    @Column(name = "link_path", length = 512)
    private String linkPath;

    @Column(name = "link_query", length = 1024)
    private String linkQuery;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
