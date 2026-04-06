package com.optimize.elykia.core.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class StockRequestItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JsonIgnore
    private StockRequest stockRequest;

    @ManyToOne
    private Articles article;

    private Integer quantity;

    // Prix enregistrés au moment de la demande/sortie
    @Column(columnDefinition = "double precision default 0")
    private Double unitPrice; // Prix de vente unitaire (creditSalePrice)

    @Column(columnDefinition = "double precision default 0")
    private Double purchasePrice; // Prix d'achat (purchasePrice)
    private String itemName;
}
