package com.optimize.elykia.commercialstock.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "commercial_stock_return_item")
@Getter
@Setter
@NoArgsConstructor
public class CommercialStockReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "return_id", nullable = false)
    @JsonIgnore
    private CommercialStockReturn stockReturn;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "item_name", columnDefinition = "TEXT")
    private String itemName;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_sale_price")
    private Double unitSalePrice = 0.0;

    @Column(name = "unit_purchase_cost")
    private Double unitPurchaseCost = 0.0;
}
