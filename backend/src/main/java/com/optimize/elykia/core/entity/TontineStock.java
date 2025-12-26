package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.exception.CustomValidationException;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

// add unique constraint across commercial, article_id and year
@Table(
        name = "tontine_stock",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tontine_stock_commercial_article_year",
                columnNames = {"commercial", "article_id", "year"}
        )
)
@Getter
@Setter
@Entity
public class TontineStock extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "commercial", nullable = false)
    private String commercial;
    private Long creditId;
    @Column(name = "article_id", nullable = false)
    private Long articleId;
    private String articleName;
    private Double unitPrice;
    private Integer totalQuantity;
    private Integer availableQuantity;
    private Integer distributedQuantity;
    @Column(name = "year", nullable = false)
    private Integer year;
    private Long tontineSessionId;

    public static TontineStock build(Credit tontine, CreditArticles articles, TontineSession tontineSession) {
        TontineStock tontineStock = new TontineStock();
        tontineStock.articleId = articles.getArticlesId();
        tontineStock.articleName = articles.getArticles().getCommercialName();
        tontineStock.unitPrice = articles.getUnitPrice();
        tontineStock.totalQuantity = articles.getQuantity();
        tontineStock.creditId = tontine.getId();
        tontineStock.availableQuantity = articles.getQuantity();
        tontineStock.distributedQuantity = 0;
        tontineStock.setCommercial(tontine.getCollector());
        tontineStock.tontineSessionId = tontineSession.getId();
        tontineStock.year = tontineSession.getYear();
        return tontineStock;

    }

    public void addQuantity(Integer quantity) {
        this.totalQuantity += quantity;
        this.availableQuantity += quantity;
    }

    public void removeQuantity(Integer quantity) {
        if (this.availableQuantity < quantity) {
            throw new CustomValidationException("l'Article "+ this.articleName +" n'a pas assez de stock pour la livraison! \n Stock Restant: "+ this.availableQuantity);
        }
        this.availableQuantity -= quantity;
        this.distributedQuantity += quantity;
    }

}
