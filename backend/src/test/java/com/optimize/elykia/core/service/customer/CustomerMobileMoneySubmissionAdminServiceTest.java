package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.customer.CustomerMobileMoneySubmissionRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.service.sale.CreditTimelineService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerMobileMoneySubmissionAdminServiceTest {

    @Mock private CustomerMobileMoneySubmissionRepository submissionRepository;
    @Mock private CreditRepository creditRepository;
    @Mock private ClientService clientService;
    @Mock private AppNotificationService appNotificationService;
    @Mock private CreditTimelineService creditTimelineService;
    @Mock private CustomerNotificationService customerNotificationService;

    @InjectMocks
    private CustomerMobileMoneySubmissionAdminService service;

    @Test
    void validate_rejectsForeignPromoter() {
        User promoter = mock(User.class);
        when(promoter.getUsername()).thenReturn("COM003");
        when(promoter.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(promoter.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(promoter.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(promoter.is(UserProfilConstant.PROMOTER)).thenReturn(true);

        CustomerMobileMoneySubmission submission = initiatedSubmission();
        when(submissionRepository.findById(5L)).thenReturn(Optional.of(submission));

        Client client = new Client();
        client.setId(9L);
        client.setCollector("COM999");
        client.setTontineCollector("COM888");
        when(clientService.getById(9L)).thenReturn(client);

        Credit credit = new Credit();
        credit.setId(1L);
        credit.setCollector("COM999");
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));

        assertThrows(CustomValidationException.class, () -> service.validate(promoter, 5L));
        verify(creditTimelineService, never()).makeDailyStake(any());
        verify(appNotificationService, never()).resolveByTypeAndEntityId(any(), any());
    }

    @Test
    void validate_createsCreditTimelineAndMarksValide() {
        User secretary = mock(User.class);
        when(secretary.getUsername()).thenReturn("SEC");
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);

        CustomerMobileMoneySubmission submission = initiatedSubmission();
        when(submissionRepository.findById(5L)).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Client client = new Client();
        client.setId(9L);
        client.setFirstname("A");
        client.setLastname("B");
        client.setCollector("COM003");
        when(clientService.getById(9L)).thenReturn(client);

        Credit credit = new Credit();
        credit.setId(1L);
        credit.setCollector("COM003");
        credit.setDailyStake(1000.0);
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));

        CreditTimeline timeline = new CreditTimeline();
        timeline.setId(77L);
        when(creditTimelineService.makeDailyStake(any())).thenReturn(timeline);

        var dto = service.validate(secretary, 5L);

        assertEquals(CustomerSubmissionStatus.VALIDE, dto.getStatus());
        assertEquals(77L, dto.getCreditTimelineId());
        assertEquals(77L, submission.getCreditTimelineId());
        assertEquals("SEC", submission.getValidatedBy());
        assertNotNull(submission.getValidatedAt());

        ArgumentCaptor<CreditTimelineDto> captor = ArgumentCaptor.forClass(CreditTimelineDto.class);
        verify(creditTimelineService).makeDailyStake(captor.capture());
        CreditTimelineDto timelineDto = captor.getValue();
        assertEquals(1L, timelineDto.getCreditId());
        assertEquals(1000.0, timelineDto.getAmount());
        assertEquals("CS-CREDIT-5", timelineDto.getReference());
        assertEquals(Boolean.TRUE, timelineDto.getNormalStake());
        assertEquals("COM003", timelineDto.getCollector());

        verify(appNotificationService).resolveByTypeAndEntityId(AppNotificationType.PAYMENT_DECLARATION, 5L);
    }

    @Test
    void validate_requiresExistingCredit() {
        User secretary = mock(User.class);
        when(secretary.getUsername()).thenReturn("SEC");
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);

        when(submissionRepository.findById(5L)).thenReturn(Optional.of(initiatedSubmission()));
        when(clientService.getById(9L)).thenReturn(new Client());
        when(creditRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.validate(secretary, 5L));
        verify(creditTimelineService, never()).makeDailyStake(any());
    }

    @Test
    void list_secretarySeesInitiated() {
        User secretary = mock(User.class);
        when(secretary.getUsername()).thenReturn("SEC");
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);

        CustomerMobileMoneySubmission submission = initiatedSubmission();
        submission.setId(1L);
        submission.setClientId(2L);
        submission.setCreditId(3L);

        when(submissionRepository.findByStatusOptional(
                eq(CustomerSubmissionStatus.INITIE), eq(State.ENABLED), any()))
                .thenReturn(new PageImpl<>(List.of(submission)));

        Client client = new Client();
        client.setId(2L);
        client.setFirstname("C");
        client.setLastname("D");
        client.setCollector("COM003");
        when(clientService.getById(2L)).thenReturn(client);
        when(creditRepository.findById(3L)).thenReturn(Optional.empty());

        var page = service.list(secretary, CustomerSubmissionStatus.INITIE, PageRequest.of(0, 10));
        assertEquals(1, page.getContent().size());
    }

    private static CustomerMobileMoneySubmission initiatedSubmission() {
        CustomerMobileMoneySubmission submission = new CustomerMobileMoneySubmission();
        submission.setId(5L);
        submission.setClientId(9L);
        submission.setCreditId(1L);
        submission.setStatus(CustomerSubmissionStatus.INITIE);
        submission.setMobileMoneyAmount(1000.0);
        submission.setMobileMoneyPhone("90000000");
        submission.setMobileMoneyReference("R1");
        submission.setInstallmentNumber(1);
        submission.setExpectedAmount(1000.0);
        return submission;
    }
}
