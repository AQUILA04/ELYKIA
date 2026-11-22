package com.optimize.elykia.sale.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.inventory.application.ArticlesService;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.domain.CommercialMonthlyStock;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.CreditDto;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.sale.web.mapper.CreditMapper;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashSaleServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditMapper creditMapper;
    @Mock private ClientService clientService;
    @Mock private ArticlesService articlesService;
    @Mock private CreditArticlesService creditArticlesService;
    @Mock private CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    @Mock private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    @Mock private CommercialStockMovementService commercialStockMovementService;
    @Mock private CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService;
    @Mock private BusinessMetricsPublisher metricsPublisher;
    @Mock private StockRequestService stockRequestService;
    @Mock private CreditTimelineService creditTimelineService;

    private CashSaleService service;

    @BeforeEach
    void setUp() {
        service = new CashSaleService(
                creditRepository,
                creditMapper,
                clientService,
                articlesService,
                creditArticlesService,
                commercialMonthlyStockRepository,
                commercialMonthlyStockItemRepository,
                commercialStockMovementService,
                Optional.of(soldValueHistoryService),
                Optional.empty(),
                Optional.of(metricsPublisher),
                stockRequestService,
                creditTimelineService);
    }

    @Test
    void createCashSale_reservesWarehouseCreatesRequestAndRecordsRecovery() {
        Client client = new Client();
        client.setId(10L);
        client.setAgencyCollector("AG_COM01");
        client.setClientType(ClientType.CLIENT);

        Articles article = new Articles(5L);
        article.setName("Riz");
        article.setSellingPrice(4_000.0);
        article.setPurchasePrice(3_000.0);

        CreditArticles line = new CreditArticles();
        line.setArticles(new Articles(5L));
        line.setQuantity(2);

        Credit mapped = new Credit();
        mapped.setClient(client);
        mapped.setArticles(new HashSet<>(Set.of(line)));

        CreditDto dto = new CreditDto();
        dto.setClientId(10L);
        dto.setType(OperationType.CASH);

        when(creditMapper.toEntity(dto)).thenReturn(mapped);
        when(clientService.getById(10L)).thenReturn(client);
        when(articlesService.getById(5L)).thenReturn(article);
        when(creditRepository.save(any(Credit.class))).thenAnswer(inv -> {
            Credit c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });
        when(creditRepository.saveAndFlush(any(Credit.class))).thenAnswer(inv -> inv.getArgument(0));

        CreditRespDto resp = service.createCashSale(dto);

        assertEquals(99L, resp.id());
        assertEquals(8_000.0, resp.totalAmount());
        assertEquals(CreditStatus.VALIDATED, resp.status());
        assertTrue(resp.pendingWarehouseDelivery());
        assertTrue(resp.reference().startsWith("CSH-"));
        assertEquals("AG_COM01", resp.collector());
        verify(articlesService).reserveWarehouseQuantity(5L, 2);
        verify(stockRequestService).createValidatedCashSaleRequest(any(Credit.class));
        verify(creditTimelineService).recordInitialSaleRecovery(any(Credit.class), any());
    }

    @Test
    void createCashSale_rejectsClientWithoutCollector() {
        Client client = new Client();
        client.setId(11L);
        Credit mapped = new Credit();
        mapped.setClient(client);
        mapped.setArticles(new HashSet<>());
        CreditDto dto = new CreditDto();

        when(creditMapper.toEntity(dto)).thenReturn(mapped);
        when(clientService.getById(11L)).thenReturn(client);

        assertThrows(CustomValidationException.class, () -> service.createCashSale(dto));
    }

    @Test
    void updateCashSale_alwaysRejectsModification() {
        assertThrows(CustomValidationException.class, () -> service.updateCashSale(new CreditDto(), 1L));
    }

    @Test
    void settleCashSaleOnDelivery_updatesStockAndClosesSale() {
        Articles article = new Articles(7L);
        article.setName("Huile");
        article.setSellingPrice(2_500.0);
        article.setPurchasePrice(2_000.0);

        CreditArticles line = new CreditArticles();
        line.setId(30L);
        line.setArticles(article);
        line.setQuantity(2);
        line.setUnitPrice(2_500.0);

        Credit sale = Credit.newCashSale(new Client(), "COM001", null, Set.of(line), LocalDate.now());
        sale.setId(50L);
        sale.setReference("CSH-50");

        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setId(1L);
        stock.setCollector("COM001");
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setId(80L);
        item.setArticle(article);
        item.setMonthlyStock(stock);
        stock.addItem(item);

        when(creditRepository.findById(50L)).thenReturn(Optional.of(sale));
        when(commercialMonthlyStockRepository.findByCollectorAndMonthAndYear(eq("COM001"), anyInt(), anyInt()))
                .thenReturn(Optional.of(stock));

        service.settleCashSaleOnDelivery(50L);

        assertEquals(CreditStatus.SETTLED, sale.getStatus());
        assertFalse(sale.isPendingWarehouseDelivery());
        assertEquals(2, item.getQuantityTaken());
        assertEquals(2, item.getQuantitySold());
        verify(creditRepository).saveAndFlush(sale);
        verify(metricsPublisher).creditSettled("COM001");
        verify(commercialStockMovementService).record(
                eq(80L), eq(50L), eq("CSH-50"), any(), eq(2), eq(2), eq(0), any(), eq("COM001"),
                eq(7L), any(), any(), eq(2_500.0), any(), eq("CREDIT"), eq(50L));
    }

    @Test
    void settleCashSaleOnDelivery_rejectsSaleNotPendingDelivery() {
        Credit sale = new Credit();
        sale.setId(51L);
        sale.setType(OperationType.CASH);
        sale.setPendingWarehouseDelivery(false);
        when(creditRepository.findById(51L)).thenReturn(Optional.of(sale));

        assertThrows(CustomValidationException.class, () -> service.settleCashSaleOnDelivery(51L));
    }

    @Test
    void cancelPendingCashSale_releasesReservationAndCancelsLinkedArtifacts() {
        Articles article = new Articles(8L);
        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        line.setQuantity(3);
        line.setUnitPrice(1_000.0);

        Credit sale = Credit.newCashSale(new Client(), "COM002", null, Set.of(line), LocalDate.now());
        sale.setId(60L);
        when(creditRepository.findById(60L)).thenReturn(Optional.of(sale));

        service.cancelPendingCashSale(60L);

        assertEquals(CreditStatus.CANCELLED, sale.getStatus());
        assertFalse(sale.isPendingWarehouseDelivery());
        assertNull(sale.getEffectiveEndDate());
        verify(articlesService).releaseWarehouseReservation(8L, 3);
        verify(stockRequestService).cancelLinkedCashSaleRequest(60L);
        verify(creditTimelineService).reverseCollectionsForCancelledCashSale(sale);
        verify(creditRepository).saveAndFlush(sale);
    }

    @Test
    void cancelPendingCashSale_rejectsNonPendingOrCreditSale() {
        Credit credit = new Credit();
        credit.setId(61L);
        credit.setType(OperationType.CREDIT);
        credit.setStatus(CreditStatus.VALIDATED);
        when(creditRepository.findById(61L)).thenReturn(Optional.of(credit));

        assertThrows(CustomValidationException.class, () -> service.cancelPendingCashSale(61L));
    }
}
