package com.optimize.elykia.inventory.application;

import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleStockLotConsumptionRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleStockLotRepository;
import com.optimize.elykia.inventory.web.dto.LotLifecycleTraceDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WarehouseLotTraceabilityServiceTest {

    @Mock private ArticleStockLotRepository lotRepository;
    @Mock private ArticleStockLotConsumptionRepository consumptionRepository;
    @Mock private WarehouseCommercialStockPort commercialStockPort;

    private WarehouseLotTraceabilityService service;

    @BeforeEach
    void setUp() {
        service = new WarehouseLotTraceabilityService(lotRepository, consumptionRepository);
        service.setCommercialStockPort(commercialStockPort);
    }

    @Test
    void getLotTrace_verifiesEndToEndConservationAcrossWarehouseTransferCommercialAndClientLiquidation() {
        Articles art = new Articles(10L);
        art.setCode("ART-10");
        art.setType("Sucre");
        art.setMarque("SaintLouis");
        art.setModel("50kg");
        art.setName("Blanc");

        // Lot racine #100 : 20 unités entrées à l'Agence 1
        // - 5 restent en rayon à l'Agence 1
        // - 5 transférées vers l'Agence 2 (sous-lot #101 : 2 restent en rayon Agence 2, 3 chez COM002)
        // - 8 sorties vers COM001 (3 restent chez COM001, 4 vendues en CREDIT_SALE, 1 passée en DEBT_WRITE_OFF)
        // - 2 vendues en vente comptant directe au magasin (CASH_SALE)
        // Total : En rayon magasins = 5 + 2 = 7 ; Chez commerciaux = 3 + 3 = 6 ; Liquidé clients = 4 + 2 = 6 ; Pertes = 1 -> 7 + 6 + 6 + 1 = 20 !
        ArticleStockLot rootLot = new ArticleStockLot();
        rootLot.setId(100L);
        rootLot.setLotCode("LOT-00000100");
        rootLot.setAgencyId(1L);
        rootLot.setArticle(art);
        rootLot.setSourceType(ArticleStockLotSourceType.STOCK_RECEPTION);
        rootLot.setEntryDate(LocalDate.of(2026, 11, 1));
        rootLot.setUnitPurchasePrice(25000.0);
        rootLot.setUnitSalePrice(30000.0);
        rootLot.setQuantityInitial(20);
        rootLot.setQuantityRemaining(5);
        when(lotRepository.findById(100L)).thenReturn(Optional.of(rootLot));

        ArticleStockLot childLot = new ArticleStockLot();
        childLot.setId(101L);
        childLot.setLotCode("LOT-00000101");
        childLot.setAgencyId(2L);
        childLot.setParentLotId(100L);
        childLot.setArticle(art);
        childLot.setSourceType(ArticleStockLotSourceType.AGENCY_TRANSFER_IN);
        childLot.setEntryDate(LocalDate.of(2026, 11, 5));
        childLot.setUnitPurchasePrice(25000.0);
        childLot.setUnitSalePrice(30000.0);
        childLot.setQuantityInitial(5);
        childLot.setQuantityRemaining(2);
        when(lotRepository.findByParentLotIdOrderByIdAsc(100L)).thenReturn(List.of(childLot));
        when(lotRepository.findByParentLotIdOrderByIdAsc(101L)).thenReturn(List.of());

        // Allocations commerciales sur lot #100 (COM001 : 8 initiales, 3 restantes)
        when(commercialStockPort.findLayerTracesByOriginWarehouseLotId(100L)).thenReturn(List.of(
                new WarehouseCommercialStockPort.CommercialLayerTraceSlice(
                        1000L, "COM001", "CREDIT", 8, 3, 25000.0, 32000.0,
                        LocalDateTime.of(2026, 11, 2, 9, 0),
                        List.of(
                                new WarehouseCommercialStockPort.CommercialConsumptionSlice(
                                        9001L, "CREDIT_SALE", 4, 25000.0, 32000.0,
                                        "CREDIT", 701L, "CRD-701", LocalDate.of(2026, 11, 3), "COM001"),
                                new WarehouseCommercialStockPort.CommercialConsumptionSlice(
                                        9002L, "DEBT_WRITE_OFF", 1, 25000.0, 32000.0,
                                        "DEBT", 801L, "DBT-801", LocalDate.of(2026, 11, 10), "ges003")
                        ))
        ));

        // Allocations commerciales sur sous-lot #101 (COM002 : 3 initiales, 3 restantes)
        when(commercialStockPort.findLayerTracesByOriginWarehouseLotId(101L)).thenReturn(List.of(
                new WarehouseCommercialStockPort.CommercialLayerTraceSlice(
                        1001L, "COM002", "TONTINE", 3, 3, 25000.0, 30000.0,
                        LocalDateTime.of(2026, 11, 6, 10, 0),
                        List.of())
        ));

        // Consommations directes magasin sur lot #100
        ArticleStockLotConsumption cRelease = new ArticleStockLotConsumption();
        cRelease.setId(1L);
        cRelease.setLot(rootLot);
        cRelease.setMovementType(ArticleStockLotMovementType.WAREHOUSE_RELEASE);
        cRelease.setQuantity(8);
        cRelease.setUnitPurchasePrice(25000.0);

        ArticleStockLotConsumption cXfer = new ArticleStockLotConsumption();
        cXfer.setId(2L);
        cXfer.setLot(rootLot);
        cXfer.setMovementType(ArticleStockLotMovementType.AGENCY_TRANSFER_OUT);
        cXfer.setQuantity(5);
        cXfer.setUnitPurchasePrice(25000.0);

        ArticleStockLotConsumption cCash = new ArticleStockLotConsumption();
        cCash.setId(3L);
        cCash.setLot(rootLot);
        cCash.setMovementType(ArticleStockLotMovementType.CASH_SALE);
        cCash.setQuantity(2);
        cCash.setUnitPurchasePrice(25000.0);
        cCash.setSourceType("CASH_SALE");
        cCash.setSourceId(555L);

        when(consumptionRepository.findByLotIdOrderByIdAsc(100L)).thenReturn(List.of(cRelease, cXfer, cCash));
        when(consumptionRepository.findByLotIdOrderByIdAsc(101L)).thenReturn(List.of());

        LotLifecycleTraceDto trace = service.getLotTrace(100L);

        assertEquals(20, trace.initialQuantity());
        assertEquals(5, trace.remainingInThisLot());
        assertEquals(7, trace.totalInWarehouses());
        assertEquals(6, trace.totalWithCommercials());
        assertEquals(6, trace.totalLiquidatedToClients());
        assertEquals(1, trace.totalLostOrAdjusted());
        assertTrue(trace.conservationInvariantHolds());
        assertEquals(1, trace.childTransferLots().size());
        assertEquals(1, trace.commercialAllocations().size());
        assertEquals(1, trace.directLiquidations().size());
    }
}
