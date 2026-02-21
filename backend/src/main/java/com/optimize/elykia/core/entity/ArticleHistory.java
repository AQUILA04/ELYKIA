package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.enumaration.StockOperationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
public class ArticleHistory extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING)
    private StockOperationType operationType;
    private Integer initialQuantity;
    private Integer operationQuantity;
    private Integer finalQuantity;
    private LocalDate operationDate;
    private String operationUser;
    @ManyToOne
    private Articles articles;

    public static ArticleHistory buildEntryHistory(Articles articles, StockEntry stockEntry, String username) {
        ArticleHistory articleHistory = new ArticleHistory();
        articleHistory.setArticles(articles);
        articleHistory.setInitialQuantity(articles.getStockQuantity());
        articleHistory.setOperationQuantity(stockEntry.getQuantity());
        articleHistory.setFinalQuantity(articleHistory.calculateFinalEntryQuantity());
        articleHistory.setOperationType(StockOperationType.ENTREE);
        articleHistory.setOperationDate(LocalDate.now());
        articleHistory.setOperationUser(username);
        return articleHistory;
    }

    public static ArticleHistory buildResetHistory(Articles articles, String username) {
        ArticleHistory articleHistory = new ArticleHistory();
        articleHistory.setArticles(articles);
        articleHistory.setInitialQuantity(articles.getStockQuantity());
        articleHistory.setOperationQuantity(0);
        articleHistory.setFinalQuantity(0);
        articleHistory.setOperationType(StockOperationType.RESET);
        articleHistory.setOperationDate(LocalDate.now());
        articleHistory.setOperationUser(username);
        return articleHistory;
    }

    public static ArticleHistory buildReleaseHistory(Articles articles, Integer quantity, String username) {
        ArticleHistory articleHistory = new ArticleHistory();
        articleHistory.setArticles(articles);
        articleHistory.setInitialQuantity(articles.getStockQuantity());
        articleHistory.setOperationQuantity(quantity);
        articleHistory.setFinalQuantity(articleHistory.calculateFinalReleaseQuantity());
        articleHistory.setOperationType(StockOperationType.SORTIE);
        articleHistory.setOperationDate(LocalDate.now());
        articleHistory.setOperationUser(username);
        return articleHistory;
    }

    public static ArticleHistory buildReturnHistory(Articles articles, Integer quantity, String username) {
        ArticleHistory articleHistory = new ArticleHistory();
        articleHistory.setArticles(articles);
        articleHistory.setInitialQuantity(articles.getStockQuantity());
        articleHistory.setOperationQuantity(quantity);
        articleHistory.setFinalQuantity(articleHistory.calculateFinalEntryQuantity());
        articleHistory.setOperationType(StockOperationType.RETURN);
        articleHistory.setOperationDate(LocalDate.now());
        articleHistory.setOperationUser(username);
        return articleHistory;
    }

    public Integer calculateFinalEntryQuantity() {
        return initialQuantity + operationQuantity;
    }

    public Integer calculateFinalReleaseQuantity() {
        return initialQuantity - operationQuantity;
    }
}
