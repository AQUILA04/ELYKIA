package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.sale.RecoveryManagerActivityDto;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecoveryManagerActivityServiceTest {

    @Mock
    private CreditFieldControlRepository creditFieldControlRepository;
    @Mock
    private TontineMemberFieldControlRepository tontineFieldControlRepository;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private TontineMemberRepository tontineMemberRepository;
    @Mock
    private RecoveryManagerOperationRepository operationRepository;
    @InjectMocks
    private RecoveryManagerActivityService service;

    @Test
    void getActivity_reportsCoverageClosuresAndVerificationsOnThePeriod() {
        LocalDate start = LocalDate.of(2026, 11, 4);
        LocalDate end = LocalDate.of(2026, 11, 4);
        LocalDateTime startAt = start.atStartOfDay();
        LocalDateTime endAt = end.plusDays(1).atStartOfDay();

        when(creditFieldControlRepository.summarizeInProgressCoverage("chef.rm", startAt, endAt, "com01"))
                .thenReturn(List.<Object[]>of(new Object[]{8L, 6L, 2L}));
        when(creditFieldControlRepository.countEvents("chef.rm", startAt, endAt, "com01")).thenReturn(9L);
        when(creditRepository.countEnabledInProgress("com01")).thenReturn(42L);

        when(tontineFieldControlRepository.summarizeInProgressCoverage("chef.rm", startAt, endAt, 2026, "com01"))
                .thenReturn(List.<Object[]>of(new Object[]{5, 4, 1}));
        when(tontineFieldControlRepository.countEvents("chef.rm", startAt, endAt, "com01")).thenReturn(5L);
        when(tontineMemberRepository.countInProgressForSession(2026, "com01")).thenReturn(30L);

        when(operationRepository.countOperationsByPartial(start, end, "chef.rm", "com01", false)).thenReturn(2);
        when(operationRepository.countOperationsByPartial(start, end, "chef.rm", "com01", true)).thenReturn(1);
        when(creditRepository.countCarnetVerifiedByObserver("chef.rm", startAt, endAt, "com01")).thenReturn(3L);
        when(tontineMemberRepository.countCarnetVerifiedByObserver("chef.rm", startAt, endAt, "com01")).thenReturn(4L);

        RecoveryManagerActivityDto activity = service.getActivity(start, end, " chef.rm ", " com01 ");

        assertEquals(8, activity.getCreditControlsDone());
        assertEquals(6, activity.getCreditControlsConforme());
        assertEquals(2, activity.getCreditControlsEcart());
        assertEquals(9, activity.getCreditControlsEvents());
        assertEquals(42, activity.getCreditPortfolioTotal());
        assertEquals(19, activity.getCreditCoveragePercent());
        assertEquals(5, activity.getTontineControlsDone());
        assertEquals(30, activity.getTontinePortfolioTotal());
        assertEquals(17, activity.getTontineCoveragePercent());
        assertEquals(3, activity.getCreditClosuresCount());
        assertEquals(2, activity.getCreditFullClosures());
        assertEquals(1, activity.getCreditPartialClosures());
        assertEquals(3, activity.getCreditCarnetVerifications());
        assertEquals(4, activity.getTontineCarnetVerifications());
    }

    @Test
    void coveragePercent_isZeroWhenThePortfolioIsEmpty() {
        assertEquals(0, RecoveryManagerActivityService.coveragePercent(4, 0));
        assertEquals(100, RecoveryManagerActivityService.coveragePercent(10, 10));
    }
}
