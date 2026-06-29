package com.optimize.elykia.core.entity.sale;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.util.CreditArticleUnitPricePolicy;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CreditArticles extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JsonIgnore
    private Credit credit;
    @ManyToOne
    private Articles articles;
    private Integer quantity;
    @Column(columnDefinition = "double precision default 0")
    @Setter(AccessLevel.NONE)
    private Double unitPrice;
    @Column(columnDefinition = "double precision default 0")
    private Double unitPurchaseCost;
    private Long stockItemId;

    private Long tontineItemId;

    @Transient
    private Double persistedUnitPrice;

    public void setUnitPrice(Double unitPrice) {
        if (!Objects.equals(this.unitPrice, unitPrice)) {
            CreditArticleUnitPricePolicy.assertUnitPriceMutable(this);
        }
        this.unitPrice = unitPrice;
    }

    @PostLoad
    @PostPersist
    private void rememberUnitPrice() {
        this.persistedUnitPrice = this.unitPrice;
    }

    @PreUpdate
    private void preventFrozenUnitPriceChange() {
        if (getCredit() != null && CreditArticleUnitPricePolicy.isUnitPriceFrozen(getCredit().getStatus())) {
            if (!Objects.equals(unitPrice, persistedUnitPrice)) {
                throw new CustomValidationException(
                        "Le prix unitaire est figé pour une vente en cours ou clôturée et ne peut plus être modifié.");
            }
        }
    }

    public CreditArticles(Long articleId, Integer quantity) {
        articles = new Articles(articleId);
        this.quantity = quantity;
    }

    public Long getArticlesId() {
        if(Objects.nonNull(articles)) {
            return articles.getId();
        }
        return null;
    }

    public Long getCreditId() {
        if (Objects.nonNull(credit)) {
            return credit.getId();
        }
        return null;
    }

    public void returnQuantity (Integer quantity) {
        this.quantity -= quantity;
    }

    public void validateStock() {
        if (articles.getStockQuantity() < quantity) {
            throw new ApplicationException("Stock manquant pour démarrer le crédit: Article Manquant: " + articles.getCommercialName() + ",Quantité Restante: " + articles.getStockQuantity());
        }
    }

    public boolean hasStockAvailable() {
        return articles.getStockQuantity() >= quantity;
    }

    public static Set<CreditArticles> from (StockEntryDto entry) {
        return entry.getArticleEntries()
                .stream()
                .map(ae -> new CreditArticles(ae.getArticleId(), ae.getQuantity())).collect(Collectors.toSet());
    }
}
