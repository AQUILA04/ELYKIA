package com.optimize.elykia.commercialstock.application;

import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.commercialstock.api.*;
import com.optimize.elykia.commercialstock.domain.*;
import com.optimize.elykia.commercialstock.infrastructure.persistence.*;
import com.optimize.elykia.inventory.application.FifoStockValuationService;
import com.optimize.elykia.inventory.application.WarehouseStockService;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.web.dto.FifoConsumptionResult;
import com.optimize.elykia.inventory.web.dto.FifoLotSlice;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommercialStockRequestServiceTest {

    @Mock private CommercialStockRequestRepository requestRepository;
    @Mock private CommercialStockReturnRepository returnRepository;
    @Mock private CommercialStockLayerRepository layerRepository;
    @Mock private CommercialStockLayerConsumptionRepository layerConsumptionRepository;
    @Mock private CommercialStockLedgerEntryRepository ledgerEntryRepository;
    @Mock private CommercialStockFacade commercialStockFacade;
    @Mock private WarehouseStockService warehouseStockService;
    @Mock private FifoStockValuationService fifoStockValuationService;
    @Mock private ArticlesRepository articlesRepository;
    @Mock private UserService userService;

    private CommercialStockRequestService service;
    private final AtomicLong idGen = new AtomicLong(100);

    @BeforeEach
    void setUp() {
        service = new CommercialStockRequestService(
                requestRepository,
                returnRepository,
                layerRepository,
                layerConsumptionRepository,
                ledgerEntryRepository,
                commercialStockFacade,
                warehouseStockService,
                fifoStockValuationService,
                articlesRepository,
                userService);

        when(warehouseStockService.resolveAgencyId(any())).thenAnswer(inv -> {
            Long arg = inv.getArgument(0);
            return arg != null ? arg : 1L;
        });
        when(requestRepository.save(any())).thenAnswer(inv -> {
            CommercialStockRequest r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(idGen.incrementAndGet());
            }
            return r;
        });
        when(requestRepository.saveAndFlush(any())).thenAnswer(inv -> {
            CommercialStockRequest r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(idGen.incrementAndGet());
            }
            return r;
        });
    }

    private Articles article(Long id) {
        Articles a = new Articles(id);
        a.setType("Riz");
        a.setMarque("Royal");
        a.setModel("25kg");
        a.setName("Parfumé");
        a.setPurchasePrice(15000);
        a.setSellingPrice(18000);
        a.setCreditSalePrice(21000);
        when(articlesRepository.findById(id)).thenReturn(Optional.of(a));
        return a;
    }

    @Test
    void partialDelivery_scenarioB_deliversAvailableAndCreatesValidatedChildBackorderWithOriginLotTraceability() {
        Articles art = article(10L);

        CommercialStockRequest parent = new CommercialStockRequest();
        parent.setId(1L);
        parent.setReference("REQ-2026-11-00000001");
        parent.setAgencyId(1L);
        parent.setCommercialUsername("COM001");
        parent.setActivityType(StockActivityType.CREDIT);
        parent.setStatus(CommercialStockRequestStatus.VALIDATED);

        CommercialStockRequestItem item = new CommercialStockRequestItem();
        item.setId(11L);
        item.setArticleId(10L);
        item.setItemName("Riz: Royal 25kg Parfumé");
        item.setQuantityRequested(10);
        item.setQuantityReserved(6);
        item.setQuantityDelivered(0);
        item.setShortageQuantity(4);
        item.setUnitSalePrice(21000.0);
        item.setUnitPurchaseCost(15000.0);
        parent.addItem(item);

        when(requestRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(parent));

        WarehouseStockPosition pos = WarehouseStockPosition.open(1L, 10L);
        pos.setOnHandQuantity(6);
        pos.setReservedQuantity(6);
        when(warehouseStockService.lockOrCreatePosition(1L, 10L)).thenReturn(pos);

        FifoConsumptionResult fifo = FifoConsumptionResult.builder()
                .quantityConsumed(6)
                .averageUnitCost(15000.0)
                .totalCost(90000.0)
                .slices(List.of(FifoLotSlice.builder()
                        .lotId(501L)
                        .quantity(6)
                        .unitPurchasePrice(15000.0)
                        .unitSalePrice(18000.0)
                        .build()))
                .build();
        when(fifoStockValuationService.consumeForAgency(
                eq(1L), eq(art), eq(6), eq(ArticleStockLotMovementType.WAREHOUSE_RELEASE), anyString(), eq(1L)))
                .thenReturn(fifo);

        WarehouseStockReservation childRes = WarehouseStockReservation.create(
                1L, 10L, WarehouseReservationType.COMMERCIAL_STOCK_REQUEST,
                101L, "REQ-CHILD", "COM001", 4, 0, "mag001");
        when(warehouseStockService.reserveStock(
                eq(1L), eq(10L), eq(WarehouseReservationType.COMMERCIAL_STOCK_REQUEST),
                anyLong(), anyString(), eq("COM001"), eq(4), eq(false), anyString()))
                .thenReturn(childRes);

        CommercialStockRequestFacade.DeliveryOutcomeView outcome = service.deliverRequest(1L);

        assertTrue(outcome.partialDelivery());
        assertEquals(CommercialStockRequestStatus.DELIVERED, outcome.deliveredRequest().status());
        assertEquals(1, outcome.deliveredRequest().items().size());
        assertEquals(6, outcome.deliveredRequest().items().get(0).quantityDelivered());

        assertNotNull(outcome.childBackorderRequest());
        assertEquals(CommercialStockRequestStatus.VALIDATED, outcome.childBackorderRequest().status());
        assertEquals(1L, outcome.childBackorderRequest().parentRequestId());
        assertEquals(4, outcome.childBackorderRequest().items().get(0).quantityRequested());
        assertEquals(4, outcome.childBackorderRequest().items().get(0).shortageQuantity());

        ArgumentCaptor<StockInCommand> stockInCaptor = ArgumentCaptor.forClass(StockInCommand.class);
        verify(commercialStockFacade).stockIn(stockInCaptor.capture());
        StockInCommand stockIn = stockInCaptor.getValue();
        assertEquals("COM001", stockIn.collector());
        assertEquals(6, stockIn.quantity());
        assertEquals(501L, stockIn.originWarehouseLotId());
    }
}
