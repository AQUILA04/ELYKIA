package com.optimize.elykia.tontine.domain;

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
public class StockTontineReturnItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JsonIgnore
    private StockTontineReturn stockTontineReturn;

    @ManyToOne
    private Articles article;

    private Integer quantity;

    private Long tontineItemId;
}
