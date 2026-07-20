package com.optimize.elykia.core.entity.article;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id")
    @ToString.Exclude
    private InventoryItem inventoryItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", length = 50)
    private StockHistoryReferenceType referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reason", length = 1000)
    private String reason;

    @PrePersist
    void ensureOccurredAt() {
        if (occurredAt == null) {
            occurredAt = LocalDateTime.now();
        }
        if (operationDate == null) {
            operationDate = occurredAt.toLocalDate();
        }
    }

    public static ArticleHistory buildEntryHistory(Articles articles, StockEntry stockEntry, String username) {
        ArticleHistory articleHistory = new ArticleHistory();
        articleHistory.setArticles(articles);
        articleHistory.setInitialQuantity(articles.getStockQuantity());
        articleHistory.setOperationQuantity(stockEntry.getQuantity());
        articleHistory.setFinalQuantity(articleHistory.calculateFinalEntryQuantity());
        articleHistory.setOperationType(StockOperationType.ENTREE);
        articleHistory.setOperationDate(LocalDate.now());
        articleHistory.setOccurredAt(LocalDateTime.now());
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
        articleHistory.setOccurredAt(LocalDateTime.now());
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
        articleHistory.setOccurredAt(LocalDateTime.now());
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
        articleHistory.setOccurredAt(LocalDateTime.now());
        articleHistory.setOperationUser(username);
        return articleHistory;
    }

    public static ArticleHistory buildCancelReceptionHistory(Articles articles, Integer quantity, String username) {
        ArticleHistory articleHistory = new ArticleHistory();
        articleHistory.setArticles(articles);
        articleHistory.setInitialQuantity(articles.getStockQuantity());
        articleHistory.setOperationQuantity(quantity);
        articleHistory.setFinalQuantity(articleHistory.calculateFinalReleaseQuantity());
        articleHistory.setOperationType(StockOperationType.CANCEL_RECEPTION);
        articleHistory.setOperationDate(LocalDate.now());
        articleHistory.setOccurredAt(LocalDateTime.now());
        articleHistory.setOperationUser(username);
        return articleHistory;
    }

    public Integer calculateFinalEntryQuantity() {
        return initialQuantity + operationQuantity;
    }

    public Integer calculateFinalReleaseQuantity() {
        return initialQuantity - operationQuantity;
    }

    /** Delta signé utilisé pour reconstruire le stock (final − initial). */
    public int signedDelta() {
        if (finalQuantity != null && initialQuantity != null) {
            return finalQuantity - initialQuantity;
        }
        return 0;
    }
}
