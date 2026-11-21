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
public class StockTontineRequestItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JsonIgnore
    private StockTontineRequest stockTontineRequest;

    @ManyToOne
    private Articles article;

    private Integer quantity;

    // Prix indicatifs à la création ; prix définitifs figés à la livraison
    @Column(columnDefinition = "double precision default 0")
    private Double unitPrice; // Prix de vente unitaire

    @Column(columnDefinition = "double precision default 0")
    private Double purchasePrice; // Prix d'achat
    
    @Column(columnDefinition = "TEXT")
    private String itemName;
}
