package com.optimize.elykia.sale.domain;

import com.optimize.elykia.inventory.domain.ArticleCatalogSortOrder;
import com.optimize.elykia.sale.web.dto.CommercialStockDashboardExportDTO;
import com.optimize.elykia.sale.web.dto.StockRequestExportDTO;

import java.util.Comparator;

public final class SaleStockSortOrder {

    private SaleStockSortOrder() {
    }

    public static Comparator<StockRequestItem> forStockRequestItems() {
        return Comparator.comparing(
                StockRequestItem::getArticle,
                Comparator.nullsLast(ArticleCatalogSortOrder.byTypeMarqueModelName()));
    }

    public static Comparator<StockReturnItem> forStockReturnItems() {
        return Comparator.comparing(
                StockReturnItem::getArticle,
                Comparator.nullsLast(ArticleCatalogSortOrder.byTypeMarqueModelName()));
    }

    public static Comparator<StockRequestExportDTO> forExportDto() {
        return Comparator
                .comparing(StockRequestExportDTO::getType, nullSafeString())
                .thenComparing(StockRequestExportDTO::getMarque, nullSafeString())
                .thenComparing(StockRequestExportDTO::getModel, nullSafeString())
                .thenComparing(StockRequestExportDTO::getName, nullSafeString());
    }

    public static Comparator<CommercialStockDashboardExportDTO> forDashboardExportDto() {
        return Comparator
                .comparing(CommercialStockDashboardExportDTO::getType, nullSafeString())
                .thenComparing(CommercialStockDashboardExportDTO::getMarque, nullSafeString())
                .thenComparing(CommercialStockDashboardExportDTO::getModel, nullSafeString())
                .thenComparing(CommercialStockDashboardExportDTO::getName, nullSafeString());
    }

    private static Comparator<String> nullSafeString() {
        return Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER);
    }
}
