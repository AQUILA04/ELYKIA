package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.customer.CustomerNotificationDto;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.notification.CustomerNotification;
import com.optimize.elykia.core.enumaration.CustomerNotificationType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.notification.CustomerNotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerNotificationServiceTest {

    @Mock private CustomerNotificationRepository notificationRepository;
    @Mock private CustomerContextService contextService;

    @InjectMocks
    private CustomerNotificationService service;

    private Client client;

    @BeforeEach
    void setUp() {
        client = new Client();
        client.setId(42L);
        client.setFirstname("Franco");
        client.setLastname("DESIGN");
    }

    @Test
    void notifyRegistrationActivated_persistsWelcomeNotification() {
        when(notificationRepository.findFirstByTypeAndEntityIdAndClientIdAndState(
                CustomerNotificationType.REGISTRATION_ACTIVATED, 42L, 42L, State.ENABLED))
                .thenReturn(Optional.empty());
        when(notificationRepository.save(any(CustomerNotification.class))).thenAnswer(inv -> {
            CustomerNotification n = inv.getArgument(0);
            n.setId(1L);
            return n;
        });

        service.notifyRegistrationActivated(client);

        ArgumentCaptor<CustomerNotification> captor = ArgumentCaptor.forClass(CustomerNotification.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals(CustomerNotificationType.REGISTRATION_ACTIVATED, captor.getValue().getType());
        assertEquals("/dashboard", captor.getValue().getLinkPath());
        assertTrue(captor.getValue().getMessage().contains("activé"));
    }

    @Test
    void notifyRegistrationActivated_skipsDuplicate() {
        when(notificationRepository.findFirstByTypeAndEntityIdAndClientIdAndState(
                CustomerNotificationType.REGISTRATION_ACTIVATED, 42L, 42L, State.ENABLED))
                .thenReturn(Optional.of(new CustomerNotification()));

        service.notifyRegistrationActivated(client);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void notifyCreditPayment_validated_buildsPurchaseDeepLink() {
        CustomerMobileMoneySubmission submission = new CustomerMobileMoneySubmission();
        submission.setId(9L);
        submission.setClientId(42L);
        submission.setCreditId(101L);
        submission.setMobileMoneyAmount(35_000.0);
        submission.setMobileMoneyReference("MM-1");
        when(notificationRepository.findFirstByTypeAndEntityIdAndEntityReferenceAndClientIdAndState(
                CustomerNotificationType.CREDIT_PAYMENT_VALIDATED, 9L, "MM-1", 42L, State.ENABLED))
                .thenReturn(Optional.empty());
        when(notificationRepository.save(any(CustomerNotification.class))).thenAnswer(inv -> inv.getArgument(0));

        service.notifyCreditPayment(submission, CustomerSubmissionStatus.VALIDE);

        ArgumentCaptor<CustomerNotification> captor = ArgumentCaptor.forClass(CustomerNotification.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals("/purchases/101", captor.getValue().getLinkPath());
        assertEquals(CustomerNotificationType.CREDIT_PAYMENT_VALIDATED, captor.getValue().getType());
    }

    @Test
    void listMine_returnsOnlyCurrentClientNotifications() {
        when(contextService.currentUsername()).thenReturn("70155169");
        when(contextService.requireClient("70155169")).thenReturn(client);
        CustomerNotification notification = new CustomerNotification();
        notification.setId(3L);
        notification.setType(CustomerNotificationType.REGISTRATION_ACTIVATED);
        notification.setClientId(42L);
        notification.setTitle("Compte activé");
        notification.setMessage("Votre compte est activé. Bienvenue !");
        notification.setLinkPath("/dashboard");
        when(notificationRepository.findByClientIdAndStateOrderByCreatedDateDesc(
                eq(42L), eq(State.ENABLED), any(PageRequest.class)))
                .thenReturn(List.of(notification));

        List<CustomerNotificationDto> list = service.listMine(20);

        assertEquals(1, list.size());
        assertFalse(list.get(0).isRead());
        assertEquals("Compte activé", list.get(0).getTitle());
    }

    @Test
    void unreadCountMine_delegatesToRepository() {
        when(contextService.currentUsername()).thenReturn("70155169");
        when(contextService.requireClient("70155169")).thenReturn(client);
        when(notificationRepository.countByClientIdAndStateAndReadAtIsNull(42L, State.ENABLED)).thenReturn(2L);

        assertEquals(2L, service.unreadCountMine());
    }
}
