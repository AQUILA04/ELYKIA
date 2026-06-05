package com.optimize.elykia.core.entity.article;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "article_price_history")
public class ArticlePriceHistory extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private Articles article;

    @Column(nullable = false)
    private double previousPurchasePrice;

    @Column(nullable = false)
    private double previousSellingPrice;

    @Column(nullable = false)
    private double previousCreditSalePrice;

    @Column(nullable = false)
    private double newPurchasePrice;

    @Column(nullable = false)
    private double newSellingPrice;

    @Column(nullable = false)
    private double newCreditSalePrice;

    public ArticlePriceHistory(Articles article,
            double previousPurchasePrice, double previousSellingPrice, double previousCreditSalePrice,
            double newPurchasePrice, double newSellingPrice, double newCreditSalePrice) {
        this.article = article;
        this.previousPurchasePrice = previousPurchasePrice;
        this.previousSellingPrice = previousSellingPrice;
        this.previousCreditSalePrice = previousCreditSalePrice;
        this.newPurchasePrice = newPurchasePrice;
        this.newSellingPrice = newSellingPrice;
        this.newCreditSalePrice = newCreditSalePrice;
    }
}
