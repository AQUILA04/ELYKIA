package com.optimize.elykia.sale.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditCollectorHistory;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.infrastructure.persistence.CreditCollectorHistoryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.BulkChangeCollectorDto;
import com.optimize.elykia.sale.web.dto.CreditCollectorHistoryDto;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaleCollectorServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditCollectorHistoryRepository creditCollectorHistoryRepository;
    @Mock private ClientService clientService;
    @Mock private UserService userService;
    @Mock private BusinessMetricsPublisher metricsPublisher;

    private SaleCollectorService service;

    @BeforeEach
    void setUp() {
        service = new SaleCollectorService(
                creditRepository,
                creditCollectorHistoryRepository,
                clientService,
                userService,
                Optional.of(metricsPublisher));
    }

    @Test
    void changeCollector_recordsHistoryUpdatesClientAndPublishesMetric() {
        Client client = new Client();
        client.setId(5L);
        Credit credit = new Credit();
        credit.setId(10L);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setCollector("COM001");
        credit.setClient(client);
        credit.setTotalAmount(15_000.0);
        credit.setTotalAmountPaid(5_000.0);
        credit.setTotalAmountRemaining(10_000.0);

        when(creditRepository.findById(10L)).thenReturn(Optional.of(credit));
        when(creditRepository.saveAndFlush(credit)).thenReturn(credit);

        CreditRespDto resp = service.changeCollector(10L, "COM002");

        assertEquals("COM002", resp.collector());
        verify(creditCollectorHistoryRepository).save(any(CreditCollectorHistory.class));
        verify(clientService).updateRecoveryCollector(5L, "COM002");
        verify(metricsPublisher).creditCollectorChanged("COM001", "COM002");
    }

    @Test
    void changeCollector_rejectsNonInProgressBlankOrIdenticalCollector() {
        Credit settled = new Credit();
        settled.setId(11L);
        settled.setStatus(CreditStatus.SETTLED);
        when(creditRepository.findById(11L)).thenReturn(Optional.of(settled));
        assertThrows(CustomValidationException.class, () -> service.changeCollector(11L, "COM002"));

        Credit inProgress = new Credit();
        inProgress.setId(12L);
        inProgress.setStatus(CreditStatus.INPROGRESS);
        inProgress.setCollector("COM001");
        when(creditRepository.findById(12L)).thenReturn(Optional.of(inProgress));
        assertThrows(CustomValidationException.class, () -> service.changeCollector(12L, "   "));
        assertThrows(CustomValidationException.class, () -> service.changeCollector(12L, "COM001"));
    }

    @Test
    void bulkChangeCollector_updatesOnlyChangedCreditsAndEvictsCaches() {
        Credit unchanged = new Credit();
        unchanged.setId(1L);
        unchanged.setCollector("COM002");
        Credit toMove = new Credit();
        toMove.setId(2L);
        toMove.setCollector("COM001");

        User user = org.mockito.Mockito.mock(User.class);
        when(user.getUsername()).thenReturn("admin");

        BulkChangeCollectorDto dto = new BulkChangeCollectorDto();
        dto.setCreditIds(List.of(1L, 2L));
        dto.setNewCollector("COM002");

        when(creditRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(unchanged, toMove));
        when(userService.getCurrentUser()).thenReturn(user);

        service.bulkChangeCollector(dto);

        verify(creditCollectorHistoryRepository).bulkInsertHistoryForCredits(List.of(2L), "COM002", "admin", "admin");
        verify(creditRepository).bulkUpdateCollector(List.of(2L), "COM002");
        verify(creditRepository).bulkUpdateClientRecoveryCollector(List.of(2L), "COM002");
        verify(clientService).evictClientListCaches();
    }

    @Test
    void bulkChangeCollector_ignoresEmptyListAndRejectsAllSameCollector() {
        BulkChangeCollectorDto empty = new BulkChangeCollectorDto();
        empty.setCreditIds(List.of());
        empty.setNewCollector("COM002");
        service.bulkChangeCollector(empty);
        verify(creditRepository, never()).bulkUpdateCollector(any(), any());

        Credit alreadySame = new Credit();
        alreadySame.setId(3L);
        alreadySame.setCollector("COM002");
        BulkChangeCollectorDto same = new BulkChangeCollectorDto();
        same.setCreditIds(List.of(3L));
        same.setNewCollector("COM002");
        when(creditRepository.findAllById(List.of(3L))).thenReturn(List.of(alreadySame));
        assertThrows(CustomValidationException.class, () -> service.bulkChangeCollector(same));
    }

    @Test
    void getCollectorHistory_returnsMappedEntries() {
        Credit credit = new Credit(10L);
        CreditCollectorHistory history = new CreditCollectorHistory();
        history.setId(1L);
        history.setCredit(credit);
        history.setOldCollector("COM001");
        history.setNewCollector("COM002");
        history.setChangeDate(LocalDateTime.now());
        when(creditCollectorHistoryRepository.findByCreditIdOrderByChangeDateDesc(10L))
                .thenReturn(List.of(history));

        List<CreditCollectorHistoryDto> result = service.getCollectorHistory(10L);
        assertEquals(1, result.size());
        assertEquals("COM001", result.get(0).oldCollector());
        assertEquals("COM002", result.get(0).newCollector());
    }
}
