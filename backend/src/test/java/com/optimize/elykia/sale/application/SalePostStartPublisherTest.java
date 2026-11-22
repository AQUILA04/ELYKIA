package com.optimize.elykia.sale.application;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.sale.api.SaleBiAggregationPort;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.event.CreditStartedEvent;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SalePostStartPublisherTest {

    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private SaleBiAggregationPort biAggregationPort;
    @Mock private BusinessMetricsPublisher metricsPublisher;

    @Test
    void publishesCreditStartedEventForCreditAndSwallowsBiFailure() {
        SalePostStartPublisher publisher = new SalePostStartPublisher(
                eventPublisher, Optional.of(biAggregationPort), Optional.of(metricsPublisher));

        Client client = new Client();
        client.setFirstname("Afi");
        client.setLastname("Doe");
        Credit credit = new Credit();
        credit.setType(OperationType.CREDIT);
        credit.setClient(client);
        credit.setCollector("COM001");
        credit.setReference("C261001");
        credit.setTotalAmount(10_000.0);
        credit.setTotalPurchase(7_000.0);
        credit.setAdvance(1_000.0);

        doThrow(new RuntimeException("BI down")).when(biAggregationPort).updateSalesAggregation(credit);

        publisher.publishAfterStart(credit);

        verify(eventPublisher).publishEvent(any(CreditStartedEvent.class));
        verify(metricsPublisher).creditBiAggregationError("C261001");
    }

    @Test
    void doesNotPublishCreditStartedEventForTontineSale() {
        SalePostStartPublisher publisher = new SalePostStartPublisher(
                eventPublisher, Optional.of(biAggregationPort), Optional.empty());

        Credit tontine = new Credit();
        tontine.setType(OperationType.TONTINE);
        tontine.setTotalAmount(5_000.0);
        tontine.setTotalPurchase(3_500.0);

        publisher.publishAfterStart(tontine);

        verify(eventPublisher, never()).publishEvent(any());
        verify(biAggregationPort).updateSalesAggregation(tontine);
    }
}
