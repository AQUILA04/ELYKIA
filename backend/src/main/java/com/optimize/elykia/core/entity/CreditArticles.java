package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.StockEntryDto;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.List;
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
    private Double unitPrice;

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
