package com.optimize.elykia.sale.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.inventory.domain.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.domain.CommercialStockReturnItem}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
@Entity
@Getter
@Setter
@NoArgsConstructor
public class StockReturnItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JsonIgnore
    private StockReturn stockReturn;

    @ManyToOne
    private CommercialMonthlyStockItem stockItem;

    @ManyToOne
    private Articles article;

    private Integer quantity;

    @Column(columnDefinition = "double precision default 0")
    private Double unitPrice;
}
