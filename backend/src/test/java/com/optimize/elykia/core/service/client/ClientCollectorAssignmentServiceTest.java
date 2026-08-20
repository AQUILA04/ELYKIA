package com.optimize.elykia.core.service.client;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.dto.BulkAssignCollectorsDto;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.event.InProgressCreditsTransferEvent;
import com.optimize.elykia.core.util.UserPermissionConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientCollectorAssignmentServiceTest {

    @Mock private ClientService clientService;
    @Mock private UserService userService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private User currentUser;
    @Mock private BulkAssignCollectorsDto dto;

    @Test
    void bulkAssignCollectors_assignsClientsAndPublishesTransferEventWhenRequestedByAuthorizedUser() {
        // Given
        ClientCollectorAssignmentService service = service();
        List<Long> clientIds = List.of(10L, 11L);
        UserPermission permission = new UserPermission(UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(currentUser.getPermissions()).thenReturn(Set.of(permission));
        when(dto.getClientIds()).thenReturn(clientIds);
        when(dto.getCollector()).thenReturn("commercial.b");
        when(dto.isTransferInProgressCredits()).thenReturn(true);
        ArgumentCaptor<InProgressCreditsTransferEvent> eventCaptor =
                ArgumentCaptor.forClass(InProgressCreditsTransferEvent.class);

        // When
        service.bulkAssignCollectors(dto);

        // Then
        verify(clientService).bulkAssignCollectors(dto, "gestionnaire.a");
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        InProgressCreditsTransferEvent event = eventCaptor.getValue();
        assertEquals(clientIds, event.getClientIds());
        assertEquals("commercial.b", event.getNewCollector());
        assertEquals("gestionnaire.a", event.getPerformedBy());
    }

    @Test
    void bulkAssignCollectors_doesNotTransferCreditsWhenTheTargetCollectorIsBlank() {
        // Given
        ClientCollectorAssignmentService service = service();
        UserPermission permission = new UserPermission(UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(currentUser.getPermissions()).thenReturn(Set.of(permission));
        when(dto.getClientIds()).thenReturn(List.of(10L));
        when(dto.getCollector()).thenReturn(" ");
        when(dto.isTransferInProgressCredits()).thenReturn(true);

        // When
        service.bulkAssignCollectors(dto);

        // Then
        verify(clientService).bulkAssignCollectors(dto, "gestionnaire.a");
        verify(eventPublisher, never()).publishEvent(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void bulkAssignCollectors_rejectsUnauthorizedUserBeforeAnyClientOrCreditMutation() {
        // Given
        ClientCollectorAssignmentService service = service();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getPermissions()).thenReturn(Set.of(new UserPermission("READ_CLIENT")));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.bulkAssignCollectors(dto));

        // Then
        assertTrue(exception.getMessage().contains("peuvent changer le commercial"));
        verify(clientService, never()).bulkAssignCollectors(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        verify(eventPublisher, never()).publishEvent(org.mockito.ArgumentMatchers.any());
    }

    private ClientCollectorAssignmentService service() {
        return new ClientCollectorAssignmentService(clientService, userService, eventPublisher);
    }
}
