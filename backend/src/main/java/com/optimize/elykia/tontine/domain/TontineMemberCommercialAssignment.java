package com.optimize.elykia.tontine.domain;

import com.optimize.elykia.client.api.CommercialAssignmentStatus;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mandat d'un commercial sur un carnet tontine ({@link TontineMember}) :
 * permet qu'un commercial commence la tontine ({@code INITIATOR}) et qu'un autre prenne le relais ({@code RELAY})
 * ou co-collecte ({@code CO_COLLECTOR}), ou soit réactivé, sans écraser les collectes passées.
 */
@Entity
@Table(name = "tontine_member_commercial_assignment",
        uniqueConstraints = @UniqueConstraint(name = "uk_tmca_member_commercial",
                columnNames = {"tontine_member_id", "commercial_username"}))
@Getter
@Setter
public class TontineMemberCommercialAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tontine_member_id", nullable = false)
    private Long tontineMemberId;

    @Column(name = "commercial_username", nullable = false, length = 100)
    private String commercialUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CommercialAssignmentStatus status = CommercialAssignmentStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private TontineMemberStewardshipRole role = TontineMemberStewardshipRole.INITIATOR;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "collections_count_snapshot", nullable = false)
    private Long collectionsCountSnapshot = 0L;

    @Column(name = "collections_amount_snapshot", nullable = false)
    private Double collectionsAmountSnapshot = 0.0;

    @Column(name = "assigned_by", length = 100)
    private String assignedBy;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public boolean isActive() {
        return status == CommercialAssignmentStatus.ACTIVE;
    }
}
