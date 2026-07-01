package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "article_stock_lot")
@Getter
@Setter
@NoArgsConstructor
public class ArticleStockLot extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private Articles article;

    @Column(name = "quantity_initial", nullable = false)
    private Integer quantityInitial;

    @Column(name = "quantity_remaining", nullable = false)
    private Integer quantityRemaining;

    @Column(name = "unit_purchase_price", nullable = false)
    private Double unitPurchasePrice;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @ManyToOne
    @JoinColumn(name = "stock_reception_item_id")
    private StockReceptionItem stockReceptionItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private ArticleStockLotSourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ArticleStockLotStatus status = ArticleStockLotStatus.OPEN;
}
