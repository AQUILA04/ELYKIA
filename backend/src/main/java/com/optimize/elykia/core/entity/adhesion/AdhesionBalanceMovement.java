package com.optimize.elykia.core.entity.adhesion;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.AdhesionMovementType;
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

@Entity
@Table(name = "adhesion_balance_movement")
@Getter
@Setter
@NoArgsConstructor
public class AdhesionBalanceMovement extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_adhesion_id", nullable = false)
    private ClientAdhesion adhesion;

    @Column(nullable = false)
    private double amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 30)
    private AdhesionMovementType movementType;

    @Column(length = 500)
    private String note;
}
