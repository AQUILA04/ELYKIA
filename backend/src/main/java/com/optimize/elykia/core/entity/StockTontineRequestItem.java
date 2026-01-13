package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
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

    // Prix enregistrés au moment de la demande/sortie
    @Column(columnDefinition = "double precision default 0")
    private Double unitPrice; // Prix de vente unitaire

    @Column(columnDefinition = "double precision default 0")
    private Double purchasePrice; // Prix d'achat
    
    private String itemName;
}
