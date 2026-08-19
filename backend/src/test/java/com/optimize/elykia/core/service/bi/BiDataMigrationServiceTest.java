package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiDataMigrationServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository timelineRepository;
    @Mock private BiAggregationService biAggregationService;
    @Mock private Credit credit;
    @Mock private CreditTimeline payment;

    @Test
    void migrateHistoricalSalesData_selectsClientCreditOperationsAndSplitsMoreThanOneThousandRecords() {
        // Given
        BiDataMigrationService service = service();
        List<Credit> credits = new ArrayList<>();
        for (int index = 0; index < 1_001; index++) {
            credits.add(credit);
        }
        when(creditRepository.findByTypeAndClientType(OperationType.CREDIT, ClientType.CLIENT)).thenReturn(credits);

        // When
        service.migrateHistoricalSalesData();

        // Then
        verify(creditRepository).findByTypeAndClientType(OperationType.CREDIT, ClientType.CLIENT);
        verify(biAggregationService).updateSalesAggregations(credits.subList(0, 1_000));
        verify(biAggregationService).updateSalesAggregations(credits.subList(1_000, 1_001));
    }

    @Test
    void migrateHistoricalCollectionData_delegatesEveryPaymentBatchToCollectionAggregator() {
        // Given
        BiDataMigrationService service = service();
        List<CreditTimeline> payments = List.of(payment, payment, payment);
        when(timelineRepository.findAll()).thenReturn(payments);

        // When
        service.migrateHistoricalCollectionData();

        // Then
        verify(timelineRepository).findAll();
        verify(biAggregationService).updateCollectionAggregations(payments);
    }

    @Test
    void migrateHistoricalSalesData_rethrowsAggregationFailureToFailNonIdempotentMigration() {
        // Given
        BiDataMigrationService service = service();
        List<Credit> credits = List.of(credit);
        when(creditRepository.findByTypeAndClientType(OperationType.CREDIT, ClientType.CLIENT)).thenReturn(credits);
        doThrow(new IllegalStateException("agrégation indisponible"))
                .when(biAggregationService).updateSalesAggregations(credits);

        // When / Then
        assertThrows(IllegalStateException.class, service::migrateHistoricalSalesData);
    }

    private BiDataMigrationService service() {
        return new BiDataMigrationService(creditRepository, timelineRepository, biAggregationService);
    }
}
