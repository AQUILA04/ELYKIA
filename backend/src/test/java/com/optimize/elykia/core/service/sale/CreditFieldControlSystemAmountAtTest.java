package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CreditFieldControlSystemAmountAtTest {

    private static final LocalDateTime OBSERVED_AT = LocalDateTime.of(2026, 8, 20, 10, 0);

    private final CreditTimelineRepository timelineRepository = mock(CreditTimelineRepository.class);
    private final CreditFieldControlService service =
            new CreditFieldControlService(null, null, timelineRepository, null, null);

    private Credit credit(double paid) {
        Credit credit = new Credit();
        credit.setId(7L);
        credit.setTotalAmountPaid(paid);
        return credit;
    }

    @Test
    void systemAmountExcludesStakesRecordedAfterTheControl() {
        when(timelineRepository.sumAmountByCreditIdAndOperationDateAfter(eq(7L), eq(OBSERVED_AT))).thenReturn(300d);

        assertEquals(1700d, service.systemAmountPaidAt(credit(2000d), OBSERVED_AT), 0.0001);
    }

    @Test
    void systemAmountIsTheCurrentTotalWhenNothingFollowedTheControl() {
        when(timelineRepository.sumAmountByCreditIdAndOperationDateAfter(eq(7L), eq(OBSERVED_AT))).thenReturn(0d);

        assertEquals(2000d, service.systemAmountPaidAt(credit(2000d), OBSERVED_AT), 0.0001);
    }

    @Test
    void systemAmountNeverGoesNegative() {
        when(timelineRepository.sumAmountByCreditIdAndOperationDateAfter(eq(7L), eq(OBSERVED_AT))).thenReturn(5000d);

        assertEquals(0d, service.systemAmountPaidAt(credit(2000d), OBSERVED_AT), 0.0001);
    }

    @Test
    void systemAmountToleratesANullSum() {
        when(timelineRepository.sumAmountByCreditIdAndOperationDateAfter(eq(7L), eq(OBSERVED_AT))).thenReturn(null);

        assertEquals(2000d, service.systemAmountPaidAt(credit(2000d), OBSERVED_AT), 0.0001);
    }
}
