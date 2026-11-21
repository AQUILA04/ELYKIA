package com.optimize.elykia.tontine.domain;

import com.optimize.elykia.sale.domain.SaleStockSortOrder;
import com.optimize.elykia.sale.web.dto.CommercialStockDashboardExportDTO;
import com.optimize.elykia.sale.web.dto.StockRequestExportDTO;
import com.optimize.elykia.inventory.domain.ArticleCatalogSortOrder;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.domain.StockReceptionItem;
import com.optimize.elykia.sale.domain.StockRequestItem;
import com.optimize.elykia.sale.domain.StockReturnItem;

import java.util.Comparator;

public final class ArticleSortOrder {

    private ArticleSortOrder() {
    }

    public static Comparator<Articles> byTypeMarqueModelName() {
        return ArticleCatalogSortOrder.byTypeMarqueModelName();
    }

    public static Comparator<StockRequestItem> forStockRequestItems() {
        return SaleStockSortOrder.forStockRequestItems();
    }

    public static Comparator<StockReceptionItem> forStockReceptionItems() {
        return ArticleCatalogSortOrder.forStockReceptionItems();
    }

    public static Comparator<StockReturnItem> forStockReturnItems() {
        return SaleStockSortOrder.forStockReturnItems();
    }

    public static Comparator<StockTontineRequestItem> forStockTontineRequestItems() {
        return Comparator.comparing(StockTontineRequestItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<StockTontineReturnItem> forStockTontineReturnItems() {
        return Comparator.comparing(StockTontineReturnItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<StockRequestExportDTO> forExportDto() {
        return SaleStockSortOrder.forExportDto();
    }

    public static Comparator<CommercialStockDashboardExportDTO> forDashboardExportDto() {
        return SaleStockSortOrder.forDashboardExportDto();
    }
}
