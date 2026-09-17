package com.optimize.elykia.core.service.notification;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.notification.AppNotification;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.notification.AppNotificationReadRepository;
import com.optimize.elykia.core.repository.notification.AppNotificationRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppNotificationServiceTest {

    @Mock
    private AppNotificationRepository notificationRepository;
    @Mock
    private AppNotificationReadRepository readRepository;

    @InjectMocks
    private AppNotificationService service;

    @Test
    void unreadCount_rejectsStorekeeper() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("STORE1");
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(false);

        assertThrows(CustomValidationException.class, () -> service.unreadCount(user));
        verify(notificationRepository, never()).countUnreadUnresolvedForUser(any(), any());
    }

    @Test
    void unreadCount_promoterUsesCollectorFilter() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("COM003");
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(notificationRepository.countUnreadUnresolvedForPromoter("COM003", State.ENABLED)).thenReturn(2L);

        assertEquals(2L, service.unreadCount(user));
        verify(notificationRepository).countUnreadUnresolvedForPromoter("COM003", State.ENABLED);
        verify(notificationRepository, never()).countUnreadUnresolvedForUser(any(), any());
    }

    @Test
    void unreadCount_secretarySeesAll() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("SEC");
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(notificationRepository.countUnreadUnresolvedForUser("SEC", State.ENABLED)).thenReturn(5L);

        assertEquals(5L, service.unreadCount(user));
    }

    @Test
    void createPaymentDeclaration_persistsNotification() {
        when(notificationRepository.findByTypeAndEntityIdAndResolvedAtIsNull(
                AppNotificationType.PAYMENT_DECLARATION, 11L)).thenReturn(Optional.empty());

        CustomerMobileMoneySubmission submission = new CustomerMobileMoneySubmission();
        submission.setId(11L);
        submission.setClientId(7L);
        submission.setInstallmentNumber(2);
        submission.setMobileMoneyAmount(15_000.0);
        submission.setMobileMoneyReference("REF-1");
        submission.setStatus(CustomerSubmissionStatus.INITIE);

        Client client = new Client();
        client.setId(7L);
        client.setFirstname("Ada");
        client.setLastname("Lovelace");
        client.setCollector("COM003");
        client.setTontineCollector("COM009");

        Credit credit = new Credit();
        credit.setCollector("COM003");

        service.createPaymentDeclaration(submission, credit, client);

        ArgumentCaptor<AppNotification> captor = ArgumentCaptor.forClass(AppNotification.class);
        verify(notificationRepository).save(captor.capture());
        AppNotification saved = captor.getValue();
        assertEquals(AppNotificationType.PAYMENT_DECLARATION, saved.getType());
        assertEquals(11L, saved.getEntityId());
        assertEquals("COM003", saved.getTargetCollector());
        assertEquals("COM009", saved.getTontineCollector());
        assertEquals("/customer-payments", saved.getLinkPath());
        assertTrue(saved.getLinkQuery().contains("id=11"));
    }

    @Test
    void createCustomerOrder_persistsNotification() {
        when(notificationRepository.findByTypeAndEntityIdAndResolvedAtIsNull(
                AppNotificationType.CUSTOMER_ORDER, 44L)).thenReturn(Optional.empty());

        Order order = new Order();
        order.setId(44L);
        order.setTotalAmount(99_000.0);
        order.setOrderDate(LocalDateTime.of(2026, 9, 17, 10, 0));

        Client client = new Client();
        client.setId(3L);
        client.setFirstname("Jean");
        client.setLastname("Dupont");
        client.setCollector("COM001");
        client.setTontineCollector("COM002");

        service.createCustomerOrder(order, client);

        ArgumentCaptor<AppNotification> captor = ArgumentCaptor.forClass(AppNotification.class);
        verify(notificationRepository).save(captor.capture());
        AppNotification saved = captor.getValue();
        assertEquals(AppNotificationType.CUSTOMER_ORDER, saved.getType());
        assertEquals("CMD-44", saved.getEntityReference());
        assertEquals("/orders/details/44", saved.getLinkPath());
        assertEquals("COM001", saved.getTargetCollector());
        assertEquals("COM002", saved.getTontineCollector());
    }

    @Test
    void listGrouped_promoterOnlySeesOwnPortfolio() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("COM003");
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);

        AppNotification mine = new AppNotification();
        mine.setId(1L);
        mine.setType(AppNotificationType.CUSTOMER_ORDER);
        mine.setTitle("Commande");
        mine.setTargetCollector("COM003");
        mine.setOperationDate(java.time.LocalDate.now());

        when(notificationRepository.findUnresolvedForPromoter("COM003", State.ENABLED))
                .thenReturn(List.of(mine));
        when(readRepository.findByUsernameIgnoreCaseAndNotificationIdIn(eq("COM003"), any()))
                .thenReturn(List.of());

        assertEquals(1, service.listGrouped(user).size());
        assertEquals(1, service.listGrouped(user).get(0).items().size());
    }

    @Test
    void matchesPromoterAudience_paymentGoesToCreditCollectorOnly() {
        User comA = mock(User.class);
        when(comA.getUsername()).thenReturn("comA");
        User comB = mock(User.class);
        when(comB.getUsername()).thenReturn("comB");

        assertTrue(AppNotificationService.matchesPromoterAudience(
                comA, AppNotificationType.PAYMENT_DECLARATION, "comA", "comB"));
        assertTrue(!AppNotificationService.matchesPromoterAudience(
                comB, AppNotificationType.PAYMENT_DECLARATION, "comA", "comB"));
    }

    @Test
    void matchesPromoterAudience_tontineGoesToTontineCollectorOnly() {
        User comA = mock(User.class);
        when(comA.getUsername()).thenReturn("comA");
        User comB = mock(User.class);
        when(comB.getUsername()).thenReturn("comB");

        assertTrue(!AppNotificationService.matchesPromoterAudience(
                comA, AppNotificationType.TONTINE_CATCHUP, "comA", "comB"));
        assertTrue(AppNotificationService.matchesPromoterAudience(
                comB, AppNotificationType.TONTINE_CATCHUP, "comA", "comB"));
    }

    @Test
    void matchesPromoterAudience_orderGoesToCreditCollectorOnly() {
        User comA = mock(User.class);
        when(comA.getUsername()).thenReturn("comA");
        User comB = mock(User.class);
        when(comB.getUsername()).thenReturn("comB");

        assertTrue(AppNotificationService.matchesPromoterAudience(
                comA, AppNotificationType.CUSTOMER_ORDER, "comA", "comB"));
        assertTrue(!AppNotificationService.matchesPromoterAudience(
                comB, AppNotificationType.CUSTOMER_ORDER, "comA", "comB"));
    }
}
