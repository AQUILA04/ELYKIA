package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SoldArticleDto {
    private Long articleId;
    private String articleName;
    private Long totalQuantity;
    private String commercial;
    private Double unitPrice;
    private Double totalAmount;

    /**
     * Le prix unitaire affiché est le prix moyen pondéré des ventes regroupées
     * (montant total / quantité), donc égal au prix de vente lorsque celui-ci est unique.
     */
    public SoldArticleDto(Long articleId, String articleName, Long totalQuantity, String commercial, Double totalAmount) {
        this.articleId = articleId;
        this.articleName = articleName;
        this.totalQuantity = totalQuantity;
        this.commercial = commercial;
        this.totalAmount = totalAmount == null ? 0d : totalAmount;
        long quantity = totalQuantity == null ? 0L : totalQuantity;
        this.unitPrice = quantity > 0 ? this.totalAmount / quantity : 0d;
    }
}
