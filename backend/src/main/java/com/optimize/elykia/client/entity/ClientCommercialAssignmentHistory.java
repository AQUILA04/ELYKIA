package com.optimize.elykia.client.entity;

import com.optimize.elykia.client.api.CommercialAssignmentEventType;
import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.PortfolioActivityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Ligne immuable d'audit de chaque changement d'affectation commerciale sur un client (consultable depuis le Frontend). */
@Entity
@Table(name = "client_commercial_assignment_history")
@Getter
@Setter
public class ClientCommercialAssignmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id")
    private Long assignmentId;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "commercial_username", nullable = false, length = 100)
    private String commercialUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 20)
    private PortfolioActivityType activityType;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private CommercialAssignmentEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private CommercialAssignmentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 20)
    private CommercialAssignmentStatus newStatus;

    @Column(name = "was_primary", nullable = false)
    private boolean wasPrimary;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    @Column(name = "replaced_by_commercial_username", length = 100)
    private String replacedByCommercialUsername;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;
}
