package com.optimize.elykia.client.entity;

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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Agrégat d'affectation d'un commercial à un client pour une activité donnée (CREDIT, TONTINE, AGENCY, RECOVERY).
 * Supporte plusieurs commerciaux simultanés par activité, l'état ACTIVE/INACTIVE et la réactivation sans doublon.
 */
@Entity
@Table(name = "client_commercial_assignment",
        uniqueConstraints = @UniqueConstraint(name = "uk_client_commercial_assignment",
                columnNames = {"client_id", "commercial_username", "activity_type"}))
@Getter
@Setter
public class ClientCommercialAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "commercial_username", nullable = false, length = 100)
    private String commercialUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 20)
    private PortfolioActivityType activityType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CommercialAssignmentStatus status = CommercialAssignmentStatus.ACTIVE;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "last_activated_at", nullable = false)
    private LocalDateTime lastActivatedAt;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "status_reason", length = 255)
    private String statusReason;

    public static ClientCommercialAssignment createActive(Long clientId, String commercialUsername,
                                                          PortfolioActivityType activityType, boolean primary,
                                                          String actor, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        ClientCommercialAssignment a = new ClientCommercialAssignment();
        a.clientId = clientId;
        a.commercialUsername = commercialUsername;
        a.activityType = activityType;
        a.status = CommercialAssignmentStatus.ACTIVE;
        a.primary = primary;
        a.assignedAt = now;
        a.lastActivatedAt = now;
        a.updatedAt = now;
        a.updatedBy = actor;
        a.statusReason = reason;
        return a;
    }

    public boolean isActive() {
        return status == CommercialAssignmentStatus.ACTIVE;
    }

    public void activateOrReactivate(boolean makePrimary, String actor, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        this.status = CommercialAssignmentStatus.ACTIVE;
        if (makePrimary) {
            this.primary = true;
        }
        this.lastActivatedAt = now;
        this.deactivatedAt = null;
        this.updatedAt = now;
        this.updatedBy = actor;
        this.statusReason = reason;
    }

    public void deactivate(String actor, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        this.status = CommercialAssignmentStatus.INACTIVE;
        this.primary = false;
        this.deactivatedAt = now;
        this.updatedAt = now;
        this.updatedBy = actor;
        this.statusReason = reason;
    }
}
