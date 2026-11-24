package com.optimize.elykia.commercialstock.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Traçabilité fine : quelle quantité d'une couche a été consommée par quel mouvement (restaurations exactes). */
@Entity
@Table(name = "commercial_stock_layer_consumption")
@Getter
@Setter
public class CommercialStockLayerConsumption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movement_id", nullable = false, updatable = false)
    private Long movementId;

    @Column(name = "layer_id", nullable = false, updatable = false)
    private Long layerId;

    @Column(name = "quantity", nullable = false, updatable = false)
    private Integer quantity;

    @Column(name = "unit_purchase_cost", nullable = false, updatable = false)
    private Double unitPurchaseCost;

    @Column(name = "unit_sale_price", updatable = false)
    private Double unitSalePrice;
}
