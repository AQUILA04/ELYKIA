package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialStockLayerSourceType;
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
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Couche FIFO d'une position : le coût d'achat est immuable, seul le prix de vente effectif est réalignable.
 */
@Entity
@Table(name = "commercial_stock_layer")
@Getter
@Setter
public class CommercialStockLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private CommercialStockPosition position;

    @Column(name = "quantity_initial", nullable = false)
    private Integer quantityInitial;

    @Column(name = "quantity_remaining", nullable = false)
    private Integer quantityRemaining;

    /** Coût d'achat unitaire (lot FIFO magasin) — jamais modifié après création. */
    @Column(name = "unit_purchase_cost", nullable = false, updatable = false)
    private Double unitPurchaseCost;

    @Column(name = "initial_sale_price")
    private Double initialSalePrice;

    @Column(name = "effective_sale_price")
    private Double effectiveSalePrice;

    @Column(name = "packaging_type", length = 30)
    private String packagingType;

    @Column(name = "units_per_package")
    private Integer unitsPerPackage;

    @Column(name = "units_per_half_package")
    private Integer unitsPerHalfPackage;

    @Column(name = "wholesale_sale_price")
    private Double wholesaleSalePrice;

    @Column(name = "half_wholesale_sale_price")
    private Double halfWholesaleSalePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private CommercialStockLayerSourceType sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "acquired_at", nullable = false)
    private LocalDateTime acquiredAt;

    boolean isOpen() {
        return quantityRemaining != null && quantityRemaining > 0;
    }
}
