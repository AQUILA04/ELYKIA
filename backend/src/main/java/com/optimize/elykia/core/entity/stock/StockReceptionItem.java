package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class StockReceptionItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "stock_reception_id")
    private StockReception stockReception;

    @ManyToOne
    @JoinColumn(name = "article_id")
    private Articles article;

    private Integer quantity;

    private Double unitPrice;

    private Double totalPrice;

    @Enumerated(EnumType.STRING)
    private StockEntryPackagingMode entryPackagingMode;

    private Integer packageCount;

    private Double packagePrice;

    @Enumerated(EnumType.STRING)
    private ArticlePackagingType packagingTypeSnapshot;

    private Integer unitsPerPackageSnapshot;
}
