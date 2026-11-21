package com.optimize.elykia.tontine.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.inventory.domain.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
