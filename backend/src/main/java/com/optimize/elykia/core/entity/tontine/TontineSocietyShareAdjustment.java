package com.optimize.elykia.core.entity.tontine;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentOutcome;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentSource;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Historique des saisies de la part société d'un membre : ce que l'application avait calculé,
 * la valeur en place avant la saisie, le montant saisi et la valeur retenue.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_society_share_adjustment")
public class TontineSocietyShareAdjustment extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tontine_member_id", nullable = false)
    private Long tontineMemberId;

    @Column(name = "tontine_session_id")
    private Long tontineSessionId;

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "commercial_username")
    private String commercialUsername;

    /** Référence d'idempotence envoyée par l'écran (rejeu de synchronisation). */
    @Column(name = "reference", length = 64, unique = true)
    private String reference;

    @Column(name = "delivery_reference")
    private String deliveryReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private TontineSocietyShareAdjustmentSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    private TontineSocietyShareAdjustmentOutcome outcome;

    /** Saisie du chef de recouvrement ou d'un administrateur : elle prime sur celle du commercial. */
    @Column(name = "supervisor", nullable = false)
    private Boolean supervisor = Boolean.FALSE;

    @Column(name = "regular_contribution")
    private Double regularContribution;

    @Column(name = "computed_society_share")
    private Double computedSocietyShare;

    @Column(name = "previous_society_share")
    private Double previousSocietyShare;

    @Column(name = "declared_society_share")
    private Double declaredSocietyShare;

    @Column(name = "new_society_share")
    private Double newSocietyShare;

    /** Nouvelle part moins l'ancienne : ajoutée aux KPI de part société. */
    @Column(name = "delta")
    private Double delta;

    @Column(name = "previous_available")
    private Double previousAvailable;

    @Column(name = "new_available")
    private Double newAvailable;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "adjusted_by", length = 100)
    private String adjustedBy;

    @Column(name = "adjusted_at", nullable = false)
    private LocalDateTime adjustedAt;
}
