package com.optimize.elykia.core.service.client;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.dto.BusinessCreditAuthorizationEventDto;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessCreditAuthorizationServiceTest {

    @Mock private ClientService clientService;
    @Mock private UserService userService;
    @Mock private User currentUser;
    @Mock private ClientRespDto client;
    @Mock private BusinessCreditAuthorizationEventDto event;

    @Test
    void authorizeBusinessCredit_delegatesWithTheAuthenticatedManagerIdentity() {
        // Given
        BusinessCreditAuthorizationService service = service();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(clientService.authorizeBusinessCredit(15L, "gestionnaire.a")).thenReturn(client);

        // When
        ClientRespDto authorized = service.authorizeBusinessCredit(15L);

        // Then
        assertSame(client, authorized);
        verify(clientService).authorizeBusinessCredit(15L, "gestionnaire.a");
    }

    @Test
    void revokeBusinessCreditAuthorization_delegatesAndKeepsTheDecisionAuthor() {
        // Given
        BusinessCreditAuthorizationService service = service();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(clientService.revokeBusinessCreditAuthorization(15L, "gestionnaire.a")).thenReturn(client);

        // When
        ClientRespDto revoked = service.revokeBusinessCreditAuthorization(15L);

        // Then
        assertSame(client, revoked);
        verify(clientService).revokeBusinessCreditAuthorization(15L, "gestionnaire.a");
    }

    @Test
    void getAuthorizationHistory_rejectsNonManagerBeforeAnyClientServiceRead() {
        // Given
        BusinessCreditAuthorizationService service = service();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.getAuthorizationHistory(15L));

        // Then
        assertTrue(exception.getMessage().contains("gestionnaire"));
        verify(clientService, never()).getBusinessCreditAuthorizationHistory(15L);
    }

    private BusinessCreditAuthorizationService service() {
        return new BusinessCreditAuthorizationService(clientService, userService);
    }
}
