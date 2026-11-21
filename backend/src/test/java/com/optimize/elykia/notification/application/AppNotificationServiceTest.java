package com.optimize.elykia.notification.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.notification.api.AppNotificationType;
import com.optimize.elykia.notification.api.CustomerOrderNotificationCommand;
import com.optimize.elykia.notification.api.PaymentDeclarationNotificationCommand;
import com.optimize.elykia.notification.domain.AppNotification;
import com.optimize.elykia.notification.infrastructure.persistence.AppNotificationReadRepository;
import com.optimize.elykia.notification.infrastructure.persistence.AppNotificationRepository;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
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
    void assertPromoterOwnsCreditCollector_rejectsOtherCollectorsPortfolio() {
        User promoter = promoterOnly("COM015");
        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> AppNotificationService.assertPromoterOwnsCreditCollector(promoter, "COM003"));
        assertTrue(ex.getMessage().contains("commercial crédit"));
    }

    @Test
    void assertPromoterOwnsCreditCollector_allowsOwnPortfolioAndStaff() {
        AppNotificationService.assertPromoterOwnsCreditCollector(promoterOnly("COM015"), "COM015");
        AppNotificationService.assertPromoterOwnsCreditCollector(staffUser("SEC001"), "COM003");
        AppNotificationService.assertPromoterOwnsCreditCollector(null, "COM003");
    }

    @Test
    void assertPromoterOwnsTontineCollector_rejectsOtherCollectorsPortfolio() {
        User promoter = promoterOnly("COM015");
        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> AppNotificationService.assertPromoterOwnsTontineCollector(promoter, "COM003"));
        assertTrue(ex.getMessage().contains("commercial tontine"));
    }

    @Test
    void assertPromoterOwnsTontineCollector_allowsOwnPortfolioAndStaff() {
        AppNotificationService.assertPromoterOwnsTontineCollector(promoterOnly("COM015"), "COM015");
        AppNotificationService.assertPromoterOwnsTontineCollector(staffUser("SEC001"), "COM003");
    }

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

    private static User promoterOnly(String username) {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn(username);
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        return user;
    }

    private static User staffUser(String username) {
        User user = mock(User.class);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        return user;
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
    void unreadCountExcludingCatchup_secretaryUsesExcludingQuery() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("SEC");
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(notificationRepository.countUnreadUnresolvedExcludingCatchupForUser("SEC", State.ENABLED))
                .thenReturn(3L);

        assertEquals(3L, service.unreadCountExcludingCatchup(user));
        verify(notificationRepository).countUnreadUnresolvedExcludingCatchupForUser("SEC", State.ENABLED);
        verify(notificationRepository, never()).countUnreadUnresolvedForUser(any(), any());
        verify(notificationRepository, never()).countUnreadUnresolvedExcludingCatchupForPromoter(any(), any());
    }

    @Test
    void unreadCountExcludingCatchup_promoterUsesExcludingQuery() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("COM003");
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(notificationRepository.countUnreadUnresolvedExcludingCatchupForPromoter("COM003", State.ENABLED))
                .thenReturn(1L);

        assertEquals(1L, service.unreadCountExcludingCatchup(user));
        verify(notificationRepository).countUnreadUnresolvedExcludingCatchupForPromoter("COM003", State.ENABLED);
        verify(notificationRepository, never()).countUnreadUnresolvedForPromoter(any(), any());
        verify(notificationRepository, never()).countUnreadUnresolvedExcludingCatchupForUser(any(), any());
    }

    @Test
    void createPaymentDeclaration_persistsNotification() {
        when(notificationRepository.findByTypeAndEntityIdAndResolvedAtIsNull(
                AppNotificationType.PAYMENT_DECLARATION, 11L)).thenReturn(Optional.empty());

        service.createPaymentDeclaration(new PaymentDeclarationNotificationCommand(
                11L, "REF-1", 2, 15_000.0, 7L, "Ada Lovelace", "COM003", "COM009"));

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

        service.createCustomerOrder(new CustomerOrderNotificationCommand(
                44L, LocalDate.of(2026, 9, 17), 99_000.0, 3L, "Jean Dupont", "COM001", "COM002"));

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
    void matchesPromoterAudience_tontinePaymentGoesToTontineCollectorOnly() {
        User comA = mock(User.class);
        when(comA.getUsername()).thenReturn("comA");
        User comB = mock(User.class);
        when(comB.getUsername()).thenReturn("comB");

        assertTrue(!AppNotificationService.matchesPromoterAudience(
                comA, AppNotificationType.TONTINE_PAYMENT_DECLARATION, "comA", "comB"));
        assertTrue(AppNotificationService.matchesPromoterAudience(
                comB, AppNotificationType.TONTINE_PAYMENT_DECLARATION, "comA", "comB"));
    }
}
