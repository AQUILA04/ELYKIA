package com.optimize.elykia.inventory.domain;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

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

    private Double unitSalePrice;

    private Double wholesaleSalePrice;

    private Double halfWholesaleSalePrice;

    @ElementCollection
    @CollectionTable(name = "stock_reception_item_sale_pack", joinColumns = @JoinColumn(name = "reception_item_id"))
    private List<ReceptionSalePack> salePacks = new ArrayList<>();
}
