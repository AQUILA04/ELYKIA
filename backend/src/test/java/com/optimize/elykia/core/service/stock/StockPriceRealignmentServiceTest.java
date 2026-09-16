package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.event.ArticlePriceChangedEvent;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockPriceRealignmentServiceTest {

    @Mock
    private ArticlesService articlesService;
    @Mock
    private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    @Mock
    private TontineStockRepository tontineStockRepository;
    @Mock
    private StockReturnService stockReturnService;
    @Mock
    private StockRequestService stockRequestService;
    @Mock
    private StockTontineReturnService stockTontineReturnService;
    @Mock
    private StockTontineRequestService stockTontineRequestService;

    private StockPriceRealignmentService service;

    @BeforeEach
    void setUp() {
        service = new StockPriceRealignmentService(
                articlesService,
                commercialMonthlyStockItemRepository,
                tontineStockRepository,
                stockReturnService,
                stockRequestService,
                stockTontineReturnService,
                stockTontineRequestService);
        service.setSelf(service);
    }

    @Test
    void buildComment_containsOldNewPriceAndActor() {
        String comment = StockPriceRealignmentService.buildComment("commercial", 1000, 1200, "gest.1");
        assertTrue(comment.contains("ancien: 1000"));
        assertTrue(comment.contains("nouveau: 1200"));
        assertTrue(comment.contains("gest.1"));
        assertTrue(comment.contains("commercial"));
    }

    @Test
    void realign_commercialSync_returnsAndReissuesForEachHolder() {
        Articles article = article(5L);
        when(articlesService.getById(5L)).thenReturn(article);
        CommercialMonthlyStockItem item = commercialItem("com.a", 4);
        LocalDate now = LocalDate.now();
        when(commercialMonthlyStockItemRepository.findRemainingByArticleAndPeriod(
                5L, now.getMonthValue(), now.getYear())).thenReturn(List.of(item));

        ArticlePriceChangedEvent event = new ArticlePriceChangedEvent(
                5L, 200, 200, 300, 350, true, false, "gest.prix");

        service.realign(event);

        verify(stockReturnService).createAndValidateForPriceRealignment(eq("com.a"), eq(article), eq(4), anyString());
        verify(stockRequestService).createValidateAndDeliverForPriceRealignment(eq("com.a"), eq(article), eq(4), anyString());
        verify(stockTontineReturnService, never()).createAndValidateForPriceRealignment(
                anyString(), any(), anyInt(), anyString(), anyBoolean());
    }

    @Test
    void realign_tontineSync_returnsWithWarehouseReintegrationAndReissues() {
        Articles article = article(7L);
        when(articlesService.getById(7L)).thenReturn(article);
        TontineStock stock = new TontineStock();
        stock.setCommercial("com.t");
        stock.setAvailableQuantity(2);
        when(tontineStockRepository.findByArticleIdAndYearAndAvailableQuantityGreaterThan(
                7L, LocalDate.now().getYear(), 0)).thenReturn(List.of(stock));

        ArticlePriceChangedEvent event = new ArticlePriceChangedEvent(
                7L, 200, 250, 300, 300, false, true, "gest.prix");

        service.realign(event);

        verify(stockTontineReturnService).createAndValidateForPriceRealignment(
                eq("com.t"), eq(article), eq(2), anyString(), eq(true));
        verify(stockTontineRequestService).createValidateAndDeliverForPriceRealignment(
                eq("com.t"), eq(article), eq(2), anyString());
        verify(stockReturnService, never()).createAndValidateForPriceRealignment(
                anyString(), any(), anyInt(), anyString());
    }

    @Test
    void realign_isolatesFailurePerCollector() {
        Articles article = article(9L);
        when(articlesService.getById(9L)).thenReturn(article);
        CommercialMonthlyStockItem ok = commercialItem("com.ok", 1);
        CommercialMonthlyStockItem ko = commercialItem("com.ko", 1);
        LocalDate now = LocalDate.now();
        when(commercialMonthlyStockItemRepository.findRemainingByArticleAndPeriod(
                9L, now.getMonthValue(), now.getYear())).thenReturn(List.of(ko, ok));
        doThrow(new RuntimeException("boom"))
                .when(stockReturnService)
                .createAndValidateForPriceRealignment(eq("com.ko"), any(), anyInt(), anyString());

        ArticlePriceChangedEvent event = new ArticlePriceChangedEvent(
                9L, 200, 200, 300, 400, true, false, "gest.prix");

        service.realign(event);

        verify(stockReturnService).createAndValidateForPriceRealignment(eq("com.ko"), any(), eq(1), anyString());
        verify(stockReturnService).createAndValidateForPriceRealignment(eq("com.ok"), any(), eq(1), anyString());
        verify(stockRequestService).createValidateAndDeliverForPriceRealignment(eq("com.ok"), any(), eq(1), anyString());
    }

    private static Articles article(Long id) {
        Articles a = new Articles();
        a.setId(id);
        a.setSellingPrice(200);
        a.setCreditSalePrice(300);
        a.setPurchasePrice(100);
        return a;
    }

    private static CommercialMonthlyStockItem commercialItem(String collector, int qty) {
        CommercialMonthlyStock monthly = new CommercialMonthlyStock();
        monthly.setCollector(collector);
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setMonthlyStock(monthly);
        item.setQuantityRemaining(qty);
        return item;
    }
}
