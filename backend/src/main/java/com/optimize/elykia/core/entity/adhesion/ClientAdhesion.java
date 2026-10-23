package com.optimize.elykia.core.entity.adhesion;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.enumaration.AdhesionSource;
import com.optimize.elykia.core.enumaration.AdhesionStatus;
import com.optimize.elykia.core.enumaration.AdhesionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "client_adhesion")
@Getter
@Setter
@NoArgsConstructor
public class ClientAdhesion extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Enumerated(EnumType.STRING)
    @Column(name = "adhesion_type", nullable = false, length = 20)
    private AdhesionType adhesionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdhesionStatus status;

    @Column(name = "adhesion_fee", nullable = false)
    private double adhesionFee;

    @Column(name = "fee_waived", nullable = false)
    private boolean feeWaived;

    @Column(nullable = false)
    private double balance;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @Column(name = "activated_by")
    private String activatedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AdhesionSource source;
}
