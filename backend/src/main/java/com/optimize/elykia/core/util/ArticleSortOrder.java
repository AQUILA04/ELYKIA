package com.optimize.elykia.core.util;

import com.optimize.elykia.core.dto.CommercialStockDashboardExportDTO;
import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.entity.stock.StockReturnItem;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;
import com.optimize.elykia.core.entity.stock.StockTontineReturnItem;

import java.util.Comparator;

public final class ArticleSortOrder {

    private ArticleSortOrder() {
    }

    public static Comparator<Articles> byTypeMarqueModelName() {
        return Comparator
                .comparing(Articles::getType, nullSafeString())
                .thenComparing(Articles::getMarque, nullSafeString())
                .thenComparing(Articles::getModel, nullSafeString())
                .thenComparing(Articles::getName, nullSafeString());
    }

    public static Comparator<StockRequestItem> forStockRequestItems() {
        return Comparator.comparing(StockRequestItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<StockReceptionItem> forStockReceptionItems() {
        return Comparator.comparing(StockReceptionItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<StockReturnItem> forStockReturnItems() {
        return Comparator.comparing(StockReturnItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<StockTontineRequestItem> forStockTontineRequestItems() {
        return Comparator.comparing(StockTontineRequestItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<StockTontineReturnItem> forStockTontineReturnItems() {
        return Comparator.comparing(StockTontineReturnItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
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
