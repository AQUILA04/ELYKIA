package com.optimize.elykia.commercialstock.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "commercial_stock_request_item")
@Getter
@Setter
@NoArgsConstructor
public class CommercialStockRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    @JsonIgnore
    private CommercialStockRequest request;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "item_name", columnDefinition = "TEXT")
    private String itemName;

    @Column(name = "quantity_requested", nullable = false)
    private Integer quantityRequested;

    @Column(name = "quantity_reserved", nullable = false)
    private Integer quantityReserved = 0;

    @Column(name = "quantity_delivered", nullable = false)
    private Integer quantityDelivered = 0;

    @Column(name = "shortage_quantity", nullable = false)
    private Integer shortageQuantity = 0;

    @Column(name = "unit_sale_price", nullable = false)
    private Double unitSalePrice = 0.0;

    @Column(name = "unit_purchase_cost", nullable = false)
    private Double unitPurchaseCost = 0.0;
}
