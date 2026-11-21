package com.optimize.elykia.inventory.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.optimize.elykia.inventory.domain.ArticlePackagingType;
import com.optimize.elykia.inventory.domain.StockEntryPackagingMode;
import lombok.Data;

import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockReceptionItemDto {
    private Long id;
    private Long articleId;
    private String articleName;
    private Integer quantity;
    private Double unitPrice;
    private Double totalPrice;
    private StockEntryPackagingMode entryPackagingMode;
    private Integer packageCount;
    private Double packagePrice;
    private ArticlePackagingType packagingTypeSnapshot;
    private Integer unitsPerPackageSnapshot;

    /** Prix catalogue du jour — préremplissage UI validation FIFO uniquement. */
    private Double catalogPurchasePrice;
    private Double catalogWholesalePurchasePrice;
    private Double catalogHalfWholesalePurchasePrice;

    private Double unitSalePrice;
    private Double wholesaleSalePrice;
    private Double halfWholesaleSalePrice;
    private List<ArticleSalePackDto> salePacks;

    private Double catalogSellingPrice;
    private Double catalogWholesaleSalePrice;
    private Double catalogHalfWholesaleSalePrice;
}
