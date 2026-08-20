package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.bi.CollectionAnalyticsDaily;
import com.optimize.elykia.core.entity.bi.SalesAnalyticsDaily;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CollectionAggregationRepository;
import com.optimize.elykia.core.repository.SalesAggregationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiAggregationServiceTest {

    @Mock private SalesAggregationRepository salesAggregationRepository;
    @Mock private CollectionAggregationRepository collectionAggregationRepository;
    @Mock private Credit credit;
    @Mock private CreditTimeline payment;
    @Mock private Credit paymentCredit;

    @Test
    void updateSalesAggregation_skipsNonCreditOrNonClientOperationWithoutPersistingAnalytics() {
        // Given
        BiAggregationService service = new BiAggregationService(salesAggregationRepository, collectionAggregationRepository);
        when(credit.getType()).thenReturn(OperationType.TONTINE);

        // When
        service.updateSalesAggregation(credit);

        // Then
        verify(salesAggregationRepository, never()).findBySaleDateAndCollectorAndClientType(any(), any(), any());
        verify(salesAggregationRepository, never()).save(any());
    }

    @Test
    void updateSalesAggregation_accumulatesSalesCostProfitAverageAndSettledCollectionOnExistingDay() {
        // Given
        BiAggregationService service = new BiAggregationService(salesAggregationRepository, collectionAggregationRepository);
        LocalDate saleDate = LocalDate.of(2026, 8, 19);
        SalesAnalyticsDaily existing = new SalesAnalyticsDaily();
        existing.setSalesCount(2);
        existing.setTotalSales(20_000.0);
        existing.setTotalCost(13_000.0);
        existing.setTotalProfit(7_000.0);
        existing.setTotalCollected(4_000.0);
        existing.setSettledCount(1);
        when(credit.getType()).thenReturn(OperationType.CREDIT);
        when(credit.getClientType()).thenReturn(ClientType.CLIENT);
        when(credit.getCreatedDate()).thenReturn(saleDate.atStartOfDay());
        when(credit.getCollector()).thenReturn("commercial.a");
        when(credit.getTotalAmount()).thenReturn(15_000.0);
        when(credit.getTotalPurchase()).thenReturn(9_000.0);
        when(credit.getTotalAmountPaid()).thenReturn(15_000.0);
        when(credit.getStatus()).thenReturn(CreditStatus.SETTLED);
        when(salesAggregationRepository.findBySaleDateAndCollectorAndClientType(saleDate, "commercial.a", "CLIENT"))
                .thenReturn(Optional.of(existing));

        // When
        service.updateSalesAggregation(credit);

        // Then
        assertEquals(saleDate, existing.getSaleDate());
        assertEquals("commercial.a", existing.getCollector());
        assertEquals("CLIENT", existing.getClientType());
        assertEquals(3, existing.getSalesCount());
        assertEquals(35_000.0, existing.getTotalSales());
        assertEquals(22_000.0, existing.getTotalCost());
        assertEquals(13_000.0, existing.getTotalProfit());
        assertEquals(35_000.0 / 3, existing.getAvgSaleAmount());
        assertEquals(19_000.0, existing.getTotalCollected());
        assertEquals(2, existing.getSettledCount());
        verify(salesAggregationRepository).save(existing);
    }

    @Test
    void updateCollectionAggregation_accumulatesPaymentAndOnTimeCountersForCreditPayment() {
        // Given
        BiAggregationService service = new BiAggregationService(salesAggregationRepository, collectionAggregationRepository);
        LocalDate collectionDate = LocalDate.of(2026, 8, 19);
        CollectionAnalyticsDaily existing = new CollectionAnalyticsDaily();
        existing.setPaymentCount(1);
        existing.setTotalCollected(3_000.0);
        existing.setAvgPayment(3_000.0);
        existing.setOnTimeCount(1);
        when(payment.getCredit()).thenReturn(paymentCredit);
        when(paymentCredit.getType()).thenReturn(OperationType.CREDIT);
        when(payment.getCreationDate()).thenReturn(collectionDate);
        when(payment.getCollector()).thenReturn("commercial.a");
        when(payment.getAmount()).thenReturn(2_000.0);
        when(collectionAggregationRepository.findByCollectionDateAndCollector(collectionDate, "commercial.a"))
                .thenReturn(Optional.of(existing));

        // When
        service.updateCollectionAggregation(payment);

        // Then
        assertEquals(collectionDate, existing.getCollectionDate());
        assertEquals("commercial.a", existing.getCollector());
        assertEquals(2, existing.getPaymentCount());
        assertEquals(5_000.0, existing.getTotalCollected());
        assertEquals(2_500.0, existing.getAvgPayment());
        assertEquals(2, existing.getOnTimeCount());
        verify(collectionAggregationRepository).save(existing);
    }

    @Test
    void updateCollectionAggregation_skipsTimelineWithoutCreditBeforeQueryingOrPersisting() {
        // Given
        BiAggregationService service = new BiAggregationService(salesAggregationRepository, collectionAggregationRepository);
        when(payment.getCredit()).thenReturn(null);

        // When
        service.updateCollectionAggregation(payment);

        // Then
        verify(collectionAggregationRepository, never()).findByCollectionDateAndCollector(any(), any());
        verify(collectionAggregationRepository, never()).save(any());
    }
}
