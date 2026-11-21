package com.optimize.elykia.tontine.domain;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Seconde saisie d'une commande ou d'une livraison pour un membre qui en a déjà une.
 * Les identifiants sont stockés à plat : la ligne est écrite dans sa propre transaction,
 * y compris quand la saisie est refusée et que la transaction appelante est annulée.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_delivery_conflict")
public class TontineDeliveryConflict extends BaseEntity<String> {

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

    @Column(name = "existing_delivery_id")
    private Long existingDeliveryId;

    @Column(name = "existing_reference")
    private String existingReference;

    @Column(name = "existing_amount")
    private Double existingAmount;

    @Column(name = "existing_delivery_date")
    private LocalDateTime existingDeliveryDate;

    @Column(name = "incoming_reference")
    private String incomingReference;

    /** Code imprimé sur le reçu du second téléphone : il reste vérifiable après fusion. */
    @Column(name = "incoming_authenticity_code", length = 20)
    private String incomingAuthenticityCode;

    @Column(name = "incoming_amount")
    private Double incomingAmount;

    /** Articles de la seconde saisie, une ligne par article (« 2 × Riz 25 kg »). */
    @Column(name = "incoming_items", columnDefinition = "TEXT")
    private String incomingItems;

    @Column(name = "available_balance")
    private Double availableBalance;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation", nullable = false, length = 30)
    private TontineDeliveryConflictOperation operation;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 30)
    private TontineDeliveryConflictOutcome outcome;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 40)
    private TontineDeliveryConflictReason reason;

    @Column(name = "device_id")
    private String deviceId;

    /** Une synchronisation refusée est rejouée : on compte les tentatives au lieu de dupliquer la ligne. */
    @Column(name = "attempts", nullable = false)
    private Integer attempts = 1;

    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;
}
