package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class ClientAccountMovement extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private String movementType; // e.g., "TONTINE_DELIVERY_DEPOSIT"

    @Column(nullable = false)
    private LocalDate creationDate;

    @OneToOne
    @JoinColumn(name = "tontine_delivery_id")
    private TontineDelivery tontineDelivery;
}
