package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.WarehouseStockTransferRepository;
import com.optimize.elykia.inventory.web.dto.FifoConsumptionResult;
import com.optimize.elykia.inventory.web.dto.FifoLotSlice;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class WarehouseStockTransferServiceTest {

    @Mock private WarehouseStockTransferRepository transferRepository;
    @Mock private WarehouseStockService warehouseStockService;
    @Mock private FifoStockValuationService fifoStockValuationService;
    @Mock private ArticlesRepository articlesRepository;
    @Mock private UserService userService;

    private WarehouseStockTransferService service;
    private final AtomicLong idGen = new AtomicLong(10);

    @BeforeEach
    void setUp() {
        service = new WarehouseStockTransferService(
                transferRepository,
                warehouseStockService,
                fifoStockValuationService,
                articlesRepository,
                userService);

        User chefMag = mock(User.class);
        when(chefMag.getUsername()).thenReturn("chefmag01");
        when(chefMag.is(UserProfilConstant.STOREKEEPER_MANAGER)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(chefMag);

        when(transferRepository.save(any())).thenAnswer(inv -> {
            WarehouseStockTransfer t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId(idGen.incrementAndGet());
            }
            return t;
        });
    }

    @Test
    void fullInterAgencyTransferLifecycle_createdValidatedShippedReceivedPreservesFifoCostAndParentLotId() {
        Articles art = new Articles(7L);
        art.setType("Huile");
        art.setMarque("Mayor");
        art.setModel("5L");
        art.setName("Bidon");
        art.setPurchasePrice(8000);
        when(articlesRepository.findById(7L)).thenReturn(Optional.of(art));

        WarehouseStockTransfer transfer = service.createTransfer(new WarehouseStockTransferService.CreateTransferRequest(
                1L, 2L, "Rééquilibrage Agence 1 -> Agence 2",
                List.of(new WarehouseStockTransferService.TransferItemRequest(7L, 5))
        ));
        assertEquals(WarehouseTransferStatus.CREATED, transfer.getStatus());
        when(transferRepository.findByIdForUpdate(transfer.getId())).thenReturn(Optional.of(transfer));

        // 1. Validate -> reserves on source agency 1
        service.validateTransfer(transfer.getId());
        assertEquals(WarehouseTransferStatus.VALIDATED, transfer.getStatus());
        verify(warehouseStockService).reserveStock(
                eq(1L), eq(7L), eq(WarehouseReservationType.TRANSFER),
                eq(transfer.getId()), eq(transfer.getReference()), anyString(), eq(5), eq(true), eq("chefmag01"));

        // 2. Ship -> consumes FIFO from source agency 1 (lot #300)
        FifoConsumptionResult fifo = FifoConsumptionResult.builder()
                .quantityConsumed(5)
                .averageUnitCost(8000.0)
                .totalCost(40000.0)
                .slices(List.of(FifoLotSlice.builder()
                        .lotId(300L)
                        .quantity(5)
                        .unitPurchasePrice(8000.0)
                        .unitSalePrice(9500.0)
                        .build()))
                .build();
        when(fifoStockValuationService.consumeForAgency(
                eq(1L), eq(art), eq(5), eq(ArticleStockLotMovementType.AGENCY_TRANSFER_OUT),
                eq("WAREHOUSE_TRANSFER"), eq(transfer.getId())))
                .thenReturn(fifo);

        service.shipTransfer(transfer.getId());
        assertEquals(WarehouseTransferStatus.SHIPPED, transfer.getStatus());
        assertEquals(1, transfer.getItems().get(0).getLotSlices().size());
        assertEquals(300L, transfer.getItems().get(0).getLotSlices().get(0).getSourceLotId());

        // 3. Receive -> creates target lot on agency 2 with parentLotId = 300L
        ArticleStockLot targetLot = new ArticleStockLot();
        targetLot.setId(301L);
        targetLot.setAgencyId(2L);
        targetLot.setParentLotId(300L);
        when(fifoStockValuationService.registerEntryForAgency(
                eq(2L), eq(art), eq(5), eq(8000.0), eq(ArticleStockLotSourceType.AGENCY_TRANSFER_IN),
                isNull(), eq(300L), any()))
                .thenReturn(targetLot);

        service.receiveTransfer(transfer.getId());
        assertEquals(WarehouseTransferStatus.RECEIVED, transfer.getStatus());
        assertEquals(301L, transfer.getItems().get(0).getLotSlices().get(0).getTargetLotId());
        verify(warehouseStockService).recordStockEntry(
                eq(2L), eq(art), eq(5), eq(8000.0), eq("AGENCY_TRANSFER_IN"),
                eq("WAREHOUSE_TRANSFER"), eq(transfer.getId()), eq(transfer.getReference()),
                anyString(), anyString(), eq("chefmag01"));
    }

    @Test
    void createTransfer_rejectedForSimpleStorekeeper() {
        User simpleMag = mock(User.class);
        when(simpleMag.getUsername()).thenReturn("mag001");
        when(simpleMag.is(UserProfilConstant.MAGASINIER)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(simpleMag);

        assertThrows(CustomValidationException.class, () -> service.createTransfer(
                new WarehouseStockTransferService.CreateTransferRequest(
                        1L, 2L, "Non autorisé",
                        List.of(new WarehouseStockTransferService.TransferItemRequest(7L, 2)))));
    }
}
