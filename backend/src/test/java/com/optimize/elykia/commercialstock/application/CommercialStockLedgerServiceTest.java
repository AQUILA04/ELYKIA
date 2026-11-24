package com.optimize.elykia.commercialstock.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockConsumptionResult;
import com.optimize.elykia.commercialstock.api.CommercialStockLayerSourceType;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
import com.optimize.elykia.commercialstock.api.ConsumeStockCommand;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockLayer;
import com.optimize.elykia.commercialstock.domain.CommercialStockLayerConsumption;
import com.optimize.elykia.commercialstock.domain.CommercialStockLedgerEntry;
import com.optimize.elykia.commercialstock.domain.CommercialStockPosition;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLayerConsumptionRepository;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLedgerEntryRepository;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockPositionRepository;
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
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommercialStockLedgerServiceTest {

    @Mock
    private CommercialStockPositionRepository positionRepository;
    @Mock
    private CommercialStockLedgerEntryRepository ledgerRepository;
    @Mock
    private CommercialStockLayerConsumptionRepository consumptionRepository;

    private CommercialStockLedgerService service;
    private final AtomicLong ids = new AtomicLong(100);

    @BeforeEach
    void setUp() {
        service = new CommercialStockLedgerService(positionRepository, ledgerRepository, consumptionRepository);
        when(positionRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            CommercialStockPosition position = invocation.getArgument(0);
            if (position.getId() == null) {
                position.setId(ids.incrementAndGet());
            }
            position.getLayers().stream().filter(layer -> layer.getId() == null)
                    .forEach(layer -> layer.setId(ids.incrementAndGet()));
            return position;
        });
        when(ledgerRepository.save(any())).thenAnswer(invocation -> {
            CommercialStockLedgerEntry movement = invocation.getArgument(0);
            movement.setId(ids.incrementAndGet());
            return movement;
        });
    }

    private CommercialStockPosition position(int qty, double cost, double price) {
        CommercialStockPosition position = CommercialStockPosition.open("com.a", 7L, StockActivityType.CREDIT);
        position.setId(1L);
        CommercialStockLayer layer = position.receive(qty, cost, price, CommercialStockLayerSourceType.STOCK_REQUEST, 1L,
                LocalDateTime.of(2026, 1, 1, 0, 0));
        layer.setId(10L);
        when(positionRepository.findForUpdate("com.a", 7L, StockActivityType.CREDIT)).thenReturn(Optional.of(position));
        when(positionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(position));
        return position;
    }

    private ConsumeStockCommand sale(int quantity, LocalDate date, String backdatedReason) {
        return new ConsumeStockCommand("com.a", 7L, StockActivityType.CREDIT, CommercialStockMovementType.CREDIT_SALE,
                quantity, CommercialSalePriceSource.LAYER_FIFO, null, CommercialStockReferenceType.CREDIT, 55L, "CRD-1",
                null, date, backdatedReason, "tester");
    }

    @Test
    void consume_recordsLedgerMovementAndLayerConsumption() {
        position(5, 4000, 5000);

        CommercialStockConsumptionResult result = service.consume(sale(2, null, null));

        assertEquals(2, result.quantity());
        assertEquals(4000.0, result.averagePurchaseCost(), 0.0001);
        assertEquals(2000.0, result.marginAmount() - 0, 0.0001);
        assertEquals(3, result.quantityAfter());
        verify(consumptionRepository).saveAll(any());
    }

    @Test
    void consume_rejectsUnknownPosition() {
        when(positionRepository.findForUpdate(any(), anyLong(), any())).thenReturn(Optional.empty());
        assertThrows(CustomValidationException.class, () -> service.consume(sale(1, null, null)));
        verify(ledgerRepository, never()).save(any());
    }

    @Test
    void consume_rejectsNonConsumingMovementType() {
        ConsumeStockCommand command = new ConsumeStockCommand("com.a", 7L, StockActivityType.CREDIT,
                CommercialStockMovementType.STOCK_IN, 1, null, null, null, null, null, null, null, null, "tester");
        assertThrows(CustomValidationException.class, () -> service.consume(command));
    }

    @Test
    void backdatedSale_isRejectedWhenHistoricalBalanceWouldBecomeNegative() {
        CommercialStockPosition position = position(5, 4000, 5000);
        LocalDate date = LocalDate.of(2026, 1, 15);
        when(ledgerRepository.sumDeltaBefore(position.getId(), date)).thenReturn(1L);

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.consume(sale(2, date, "Vente non saisie")));

        assertTrue(exception.getMessage().contains("Stock insuffisant"));
        verify(ledgerRepository, never()).save(any());
    }

    @Test
    void backdatedSale_isAcceptedAndFlaggedWhenBalanceStaysNonNegative() {
        CommercialStockPosition position = position(5, 4000, 5000);
        LocalDate date = LocalDate.of(2026, 1, 15);
        when(ledgerRepository.sumDeltaBefore(position.getId(), date)).thenReturn(5L);
        CommercialStockLedgerEntry later = new CommercialStockLedgerEntry();
        later.setDeltaQuantity(-2);
        later.setAccountingDate(LocalDate.of(2026, 2, 1));
        when(ledgerRepository.findFromDate(position.getId(), date)).thenReturn(List.of(later));

        CommercialStockConsumptionResult result = service.consume(sale(2, date, "Vente non saisie"));

        assertEquals(2, result.quantity());
        verify(ledgerRepository).save(org.mockito.ArgumentMatchers.argThat(
                movement -> movement.isBackdated() && date.equals(movement.getAccountingDate())));
    }

    @Test
    void restore_putsBackExactLayerQuantitiesAndRefusesSecondRestore() {
        CommercialStockPosition position = position(5, 4000, 5000);
        CommercialStockLedgerEntry original = new CommercialStockLedgerEntry();
        original.setId(900L);
        original.setPositionId(1L);
        original.setDeltaQuantity(-2);
        original.setMovementType(CommercialStockMovementType.CREDIT_SALE);
        when(ledgerRepository.findById(900L)).thenReturn(Optional.of(original));
        CommercialStockLayerConsumption consumption = new CommercialStockLayerConsumption();
        consumption.setMovementId(900L);
        consumption.setLayerId(10L);
        consumption.setQuantity(2);
        consumption.setUnitPurchaseCost(4000.0);
        consumption.setUnitSalePrice(5000.0);
        when(consumptionRepository.findByMovementId(900L)).thenReturn(List.of(consumption));
        position.consume(2, CommercialSalePriceSource.LAYER_FIFO, null);

        CommercialStockConsumptionResult result = service.restore(900L, CommercialStockMovementType.SALE_CANCELLATION,
                null, "tester");

        assertEquals(5, result.quantityAfter());
        assertEquals(4000.0, result.averagePurchaseCost(), 0.0001);

        when(ledgerRepository.existsByReversesMovementId(900L)).thenReturn(true);
        assertThrows(CustomValidationException.class,
                () -> service.restore(900L, CommercialStockMovementType.SALE_CANCELLATION, null, "tester"));
    }

    @Test
    void transfer_movesFifoLayersWithSameCostAndRejectsSameActivity() {
        position(5, 4000, 5000);
        CommercialStockPosition target = CommercialStockPosition.open("com.a", 7L, StockActivityType.TONTINE);
        target.setId(2L);
        when(positionRepository.findForUpdate("com.a", 7L, StockActivityType.TONTINE)).thenReturn(Optional.of(target));

        String transferId = service.transferBetweenActivities("com.a", 7L, StockActivityType.CREDIT,
                StockActivityType.TONTINE, 3, 5500.0, null, "tester");

        assertTrue(transferId != null && !transferId.isBlank());
        assertEquals(3, target.getQuantityOnHand());
        assertEquals(4000.0, target.getLayers().get(0).getUnitPurchaseCost(), 0.0001);
        assertEquals(5500.0, target.getLayers().get(0).getEffectiveSalePrice(), 0.0001);
        assertThrows(CustomValidationException.class, () -> service.transferBetweenActivities("com.a", 7L,
                StockActivityType.CREDIT, StockActivityType.CREDIT, 1, null, null, "tester"));
    }

    @Test
    void realignSalePrices_writesZeroDeltaRevaluationAndKeepsPurchaseCost() {
        CommercialStockPosition position = position(5, 4000, 5000);
        when(positionRepository.findByArticle(eq(7L), any(), any())).thenReturn(List.of(position));

        int revalued = service.realignSalePrices(7L, null, null, 6500.0, "tester");

        assertEquals(5, revalued);
        assertEquals(4000.0, position.getLayers().get(0).getUnitPurchaseCost(), 0.0001);
        verify(ledgerRepository).save(org.mockito.ArgumentMatchers.argThat(
                movement -> movement.getDeltaQuantity() == 0
                        && movement.getMovementType() == CommercialStockMovementType.PRICE_REVALUATION));
    }
}
