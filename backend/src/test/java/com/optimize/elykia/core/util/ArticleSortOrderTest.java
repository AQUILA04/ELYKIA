package com.optimize.elykia.core.util;

import com.optimize.elykia.core.dto.StockRequestExportDTO;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ArticleSortOrderTest {

    @Test
    void sortsByTypeMarqueModelName() {
        StockRequestExportDTO phoneBlanc = exportDto("PHONE", "Samsung", "A10", "Blanc");
        StockRequestExportDTO phoneNoir = exportDto("PHONE", "Samsung", "A10", "Noir");
        StockRequestExportDTO tv = exportDto("TV", "LG", "55", "UHD");

        List<StockRequestExportDTO> sorted = List.of(tv, phoneNoir, phoneBlanc).stream()
                .sorted(ArticleSortOrder.forExportDto())
                .toList();

        assertEquals(List.of(phoneBlanc, phoneNoir, tv), sorted);
    }

    @Test
    void sortsStockRequestItemsByArticleFields() {
        StockRequestItem blanc = item("PHONE", "Samsung", "A10", "Blanc");
        StockRequestItem noir = item("PHONE", "Samsung", "A10", "Noir");

        List<StockRequestItem> sorted = List.of(noir, blanc).stream()
                .sorted(ArticleSortOrder.forStockRequestItems())
                .toList();

        assertEquals(List.of(blanc, noir), sorted);
    }

    private static StockRequestExportDTO exportDto(String type, String marque, String model, String name) {
        return new StockRequestExportDTO(
                type + ": " + marque + " " + model + " " + name,
                1L,
                100.0,
                100.0,
                type,
                marque,
                model,
                name);
    }

    @Test
    void sortsStockReceptionItemsByArticleFields() {
        StockReceptionItem blanc = receptionItem("PHONE", "Samsung", "A10", "Blanc");
        StockReceptionItem noir = receptionItem("PHONE", "Samsung", "A10", "Noir");

        List<StockReceptionItem> sorted = List.of(noir, blanc).stream()
                .sorted(ArticleSortOrder.forStockReceptionItems())
                .toList();

        assertEquals(List.of(blanc, noir), sorted);
    }

    private static StockReceptionItem receptionItem(String type, String marque, String model, String name) {
        Articles article = new Articles();
        article.setType(type);
        article.setMarque(marque);
        article.setModel(model);
        article.setName(name);

        StockReceptionItem receptionItem = new StockReceptionItem();
        receptionItem.setArticle(article);
        return receptionItem;
    }

    private static StockRequestItem item(String type, String marque, String model, String name) {
        Articles article = new Articles();
        article.setType(type);
        article.setMarque(marque);
        article.setModel(model);
        article.setName(name);

        StockRequestItem stockRequestItem = new StockRequestItem();
        stockRequestItem.setArticle(article);
        stockRequestItem.setItemName(article.getCommercialName() + " " + name);
        return stockRequestItem;
    }
}
