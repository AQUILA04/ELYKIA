package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "unit_sale_price")
    private Double unitSalePrice;

    @Column(name = "wholesale_sale_price")
    private Double wholesaleSalePrice;

    @Column(name = "half_wholesale_sale_price")
    private Double halfWholesaleSalePrice;

    @Column(name = "wholesale_purchase_price")
    private Double wholesalePurchasePrice;

    @Column(name = "half_wholesale_purchase_price")
    private Double halfWholesalePurchasePrice;

    @Column(name = "units_per_package")
    private Integer unitsPerPackage;

    @Column(name = "units_per_half_package")
    private Integer unitsPerHalfPackage;

    @Enumerated(EnumType.STRING)
    @Column(name = "packaging_type")
    private ArticlePackagingType packagingType;

    @OneToMany(mappedBy = "lot", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArticleStockLotSalePack> salePacks = new ArrayList<>();
}
