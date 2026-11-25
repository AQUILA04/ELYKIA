package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.*;
import com.optimize.elykia.organization.domain.Agency;
import com.optimize.elykia.organization.infrastructure.persistence.AgencyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WarehouseStockServiceTest {

    @Mock private WarehouseStockPositionRepository positionRepository;
    @Mock private WarehouseStockReservationRepository reservationRepository;
    @Mock private WarehouseStockLedgerEntryRepository ledgerRepository;
    @Mock private ArticlesRepository articlesRepository;
    @Mock private AgencyRepository agencyRepository;
    @Mock private FifoStockValuationService fifoStockValuationService;
    @Mock private WarehouseCommercialStockPort commercialStockPort;

    private WarehouseStockService service;
    private final AtomicLong idGen = new AtomicLong(10);

    @BeforeEach
    void setUp() {
        service = new WarehouseStockService(
                positionRepository,
                reservationRepository,
                ledgerRepository,
                articlesRepository,
                agencyRepository,
                fifoStockValuationService);
        service.setCommercialStockPort(commercialStockPort);

        Agency defaultAgency = new Agency();
        defaultAgency.setId(1L);
        defaultAgency.setCode("DEFAULT");
        defaultAgency.setName("Agence Centrale");
        when(agencyRepository.findAll()).thenReturn(List.of(defaultAgency));

        when(positionRepository.saveAndFlush(any())).thenAnswer(inv -> {
            WarehouseStockPosition p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId(idGen.incrementAndGet());
            }
            return p;
        });
        when(reservationRepository.save(any())).thenAnswer(inv -> {
            WarehouseStockReservation r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(idGen.incrementAndGet());
            }
            return r;
        });
        when(ledgerRepository.save(any())).thenAnswer(inv -> {
            WarehouseStockLedgerEntry e = inv.getArgument(0);
            if (e.getId() == null) {
                e.setId(idGen.incrementAndGet());
            }
            return e;
        });
    }

    private Articles article(Long id, int legacyStock) {
        Articles a = new Articles(id);
        a.setType("TV");
        a.setMarque("Samsung");
        a.setModel("32");
        a.setName("HD");
        a.setPurchasePrice(50000);
        a.setSellingPrice(65000);
        a.setCreditSalePrice(75000);
        a.setStockQuantity(legacyStock);
        when(articlesRepository.findById(id)).thenReturn(Optional.of(a));
        return a;
    }

    @Test
    void reserveStock_optionA_partiallyReservesWhenAvailableIsLessThanRequested() {
        article(5L, 6);
        WarehouseStockPosition pos = WarehouseStockPosition.open(1L, 5L);
        pos.setId(100L);
        pos.setOnHandQuantity(6);
        pos.setReservedQuantity(0);
        when(positionRepository.findForUpdate(1L, 5L)).thenReturn(Optional.of(pos));

        WarehouseStockReservation res = service.reserveStock(
                1L,
                5L,
                WarehouseReservationType.COMMERCIAL_STOCK_REQUEST,
                42L,
                "REQ-2026-11-0001",
                "COM001",
                10,
                false,
                "ges003");

        assertEquals(10, res.getQuantityRequested());
        assertEquals(6, res.getQuantityReserved());
        assertEquals(4, res.getShortageQuantity());
        assertEquals(WarehouseReservationStatus.PARTIALLY_RESERVED, res.getStatus());
        assertEquals(6, pos.getOnHandQuantity());
        assertEquals(6, pos.getReservedQuantity());
        assertEquals(0, pos.availableQuantity());
    }

    @Test
    void recordStockEntry_autoAllocatesIncomingStockToBackordersInFifo() {
        Articles art = article(5L, 6);
        WarehouseStockPosition pos = WarehouseStockPosition.open(1L, 5L);
        pos.setId(100L);
        pos.setOnHandQuantity(6);
        pos.setReservedQuantity(6);
        when(positionRepository.findForUpdate(1L, 5L)).thenReturn(Optional.of(pos));

        WarehouseStockReservation backorder = WarehouseStockReservation.create(
                1L, 5L, WarehouseReservationType.COMMERCIAL_STOCK_REQUEST,
                42L, "REQ-2026-11-0001", "COM001", 10, 6, "ges003");
        backorder.setId(200L);
        when(reservationRepository.findByAgencyIdAndArticleIdAndStatusInOrderByCreatedAtAscIdAsc(
                eq(1L), eq(5L), any())).thenReturn(List.of(backorder));

        WarehouseStockLedgerEntry entry = service.recordStockEntry(
                1L, art, 5, 50000.0, "ENTREE", "STOCK_RECEPTION", 99L, "REC-01",
                "mag001", "Réception", "mag001");

        assertEquals(11, pos.getOnHandQuantity());
        assertEquals(10, pos.getReservedQuantity());
        assertEquals(1, pos.availableQuantity());
        assertEquals(10, backorder.getQuantityReserved());
        assertEquals(0, backorder.getShortageQuantity());
        assertEquals(WarehouseReservationStatus.ACTIVE, backorder.getStatus());
        assertEquals(5, entry.getQuantityDelta());
        verify(commercialStockPort).onReservationAutoAllocated(42L, 5L, 10, 0);
    }

    @Test
    void reserveStock_withRequireFullAvailability_throwsWhenInsufficient() {
        article(5L, 2);
        WarehouseStockPosition pos = WarehouseStockPosition.open(1L, 5L);
        pos.setOnHandQuantity(2);
        pos.setReservedQuantity(0);
        when(positionRepository.findForUpdate(1L, 5L)).thenReturn(Optional.of(pos));

        assertThrows(CustomValidationException.class, () -> service.reserveStock(
                1L, 5L, WarehouseReservationType.TRANSFER, 77L, "XFER-1", "AGENCE-2", 5, true, "chefmag"));
    }
}
