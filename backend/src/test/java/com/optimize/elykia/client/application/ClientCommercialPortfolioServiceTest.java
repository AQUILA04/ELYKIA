package com.optimize.elykia.client.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.api.BulkPortfolioOperationMode;
import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.CommercialPortfolioAccessPort;
import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.dto.BulkPortfolioOperationDto;
import com.optimize.elykia.client.dto.BulkPortfolioPreviewDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.entity.ClientCommercialAssignment;
import com.optimize.elykia.client.repository.ClientCommercialAssignmentHistoryRepository;
import com.optimize.elykia.client.repository.ClientCommercialAssignmentRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClientCommercialPortfolioServiceTest {

    private ClientCommercialAssignmentRepository assignmentRepository;
    private ClientCommercialAssignmentHistoryRepository historyRepository;
    private ClientRepository clientRepository;
    private UserService userService;
    private ApplicationEventPublisher eventPublisher;
    private ClientCommercialPortfolioService service;

    private final List<ClientCommercialAssignment> store = new ArrayList<>();
    private final AtomicLong ids = new AtomicLong(1);
    private Client client;

    @BeforeEach
    void setUp() {
        assignmentRepository = mock(ClientCommercialAssignmentRepository.class);
        historyRepository = mock(ClientCommercialAssignmentHistoryRepository.class);
        clientRepository = mock(ClientRepository.class);
        userService = mock(UserService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);

        User actor = mock(User.class);
        when(actor.getUsername()).thenReturn("manager.1");
        when(userService.getCurrentUser()).thenReturn(actor);

        client = new Client();
        client.setId(42L);
        client.setQuarter("TOKOIN");
        when(clientRepository.findById(42L)).thenReturn(Optional.of(client));
        when(clientRepository.findAllByIds(any())).thenReturn(List.of(client));

        when(assignmentRepository.save(any())).thenAnswer(inv -> {
            ClientCommercialAssignment a = inv.getArgument(0);
            if (a.getId() == null) {
                a.setId(ids.getAndIncrement());
                store.add(a);
            }
            return a;
        });
        when(assignmentRepository.findById(any())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return store.stream().filter(a -> id.equals(a.getId())).findFirst();
        });
        when(assignmentRepository.findByClientIdAndActivityTypeOrderByPrimaryDescStatusAscIdAsc(any(), any()))
                .thenAnswer(inv -> {
                    Long cid = inv.getArgument(0);
                    PortfolioActivityType act = inv.getArgument(1);
                    return store.stream()
                            .filter(a -> cid.equals(a.getClientId()) && act == a.getActivityType())
                            .toList();
                });
        when(assignmentRepository.findByClientIdAndCommercialUsernameIgnoreCaseAndActivityType(any(), any(), any()))
                .thenAnswer(inv -> {
                    Long cid = inv.getArgument(0);
                    String user = inv.getArgument(1);
                    PortfolioActivityType act = inv.getArgument(2);
                    return store.stream()
                            .filter(a -> cid.equals(a.getClientId())
                                    && a.getCommercialUsername().equalsIgnoreCase(user)
                                    && act == a.getActivityType())
                            .findFirst();
                });
        when(assignmentRepository.existsByClientIdAndCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(
                any(), any(), any(), any())).thenAnswer(inv -> {
            Long cid = inv.getArgument(0);
            String user = inv.getArgument(1);
            PortfolioActivityType act = inv.getArgument(2);
            CommercialAssignmentStatus st = inv.getArgument(3);
            return store.stream().anyMatch(a -> cid.equals(a.getClientId())
                    && a.getCommercialUsername().equalsIgnoreCase(user)
                    && act == a.getActivityType()
                    && st == a.getStatus());
        });
        when(assignmentRepository.findByCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(any(), any(), any()))
                .thenAnswer(inv -> {
                    String user = inv.getArgument(0);
                    PortfolioActivityType act = inv.getArgument(1);
                    CommercialAssignmentStatus st = inv.getArgument(2);
                    return store.stream()
                            .filter(a -> a.getCommercialUsername().equalsIgnoreCase(user)
                                    && act == a.getActivityType()
                                    && st == a.getStatus())
                            .toList();
                });

        service = new ClientCommercialPortfolioService(assignmentRepository, historyRepository, clientRepository,
                userService, eventPublisher);
    }

    @Test
    void assignRelayAndReactivate_tracksActiveInactiveAndSyncsClientCommercialUsername() {
        // 1. Commercial A commence en CREDIT
        ClientCommercialAssignment a = service.assignOrRelay(42L, "com.a", PortfolioActivityType.CREDIT, true, false,
                "Affectation initiale");
        assertTrue(a.isActive());
        assertTrue(a.isPrimary());
        assertEquals("com.a", client.getCreditCommercialUsername());
        assertEquals("com.a", client.getCollector());
        assertEquals(CommercialPortfolioAccessPort.AccessMode.READ_WRITE,
                service.resolveClientAccess("com.a", 42L, PortfolioActivityType.CREDIT));

        // 2. Commercial B prend le relais -> A passe INACTIVE (consultation seule sur ses propres opérations)
        ClientCommercialAssignment b = service.assignOrRelay(42L, "com.b", PortfolioActivityType.CREDIT, true, true,
                "Relais congé");
        assertTrue(b.isActive());
        assertFalse(a.isActive());
        assertEquals("com.b", client.getCreditCommercialUsername());
        assertEquals(CommercialPortfolioAccessPort.AccessMode.READ_ONLY_OWN_OPERATIONS,
                service.resolveClientAccess("com.a", 42L, PortfolioActivityType.CREDIT));
        assertThrows(CustomValidationException.class,
                () -> service.assertCommercialCanOperateOnClient("com.a", 42L, PortfolioActivityType.CREDIT));
        assertDoesNotThrow(
                () -> service.assertCommercialCanOperateOnClient("com.b", 42L, PortfolioActivityType.CREDIT));

        // 3. Co-commercial C ajouté en ACTIVE sans désactiver B
        ClientCommercialAssignment c = service.assignOrRelay(42L, "com.c", PortfolioActivityType.CREDIT, false, false,
                "Renfort zone");
        assertTrue(b.isActive());
        assertTrue(c.isActive());

        // 4. Réactivation de A : il retrouve READ_WRITE sans créer de doublon
        service.changeStatus(a.getId(), CommercialAssignmentStatus.ACTIVE, true, "Retour de congé");
        assertEquals(3, store.size());
        assertTrue(a.isActive());
        assertEquals("com.a", client.getCreditCommercialUsername());
        assertDoesNotThrow(
                () -> service.assertCommercialCanOperateOnClient("com.a", 42L, PortfolioActivityType.CREDIT));
    }

    @Test
    void bulkHandoverRelay_movesEntireSourcePortfolioToTargetCommercial() {
        service.assignOrRelay(42L, "com.a", PortfolioActivityType.CREDIT, true, false, "Init");
        service.assignOrRelay(42L, "com.a", PortfolioActivityType.TONTINE, true, false, "Init");

        BulkPortfolioOperationDto cmd = new BulkPortfolioOperationDto(
                BulkPortfolioOperationMode.HANDOVER_RELAY,
                List.of(PortfolioActivityType.CREDIT, PortfolioActivityType.TONTINE),
                "com.a", "com.b", null, "TOKOIN", true, "Relais portefeuille complet");

        BulkPortfolioPreviewDto preview = service.previewBulkOperation(cmd);
        assertEquals(1, preview.impactedClientsCount());
        assertEquals(2, preview.impactedAssignmentsCount());

        BulkPortfolioPreviewDto executed = service.executeBulkOperation(cmd);
        assertEquals(1, executed.impactedClientsCount());
        assertEquals("com.b", client.getCreditCommercialUsername());
        assertEquals("com.b", client.getTontineCommercialUsername());
        assertTrue(service.isCommercialInactiveOnClient("com.a", 42L, PortfolioActivityType.CREDIT));
        assertTrue(service.isCommercialActiveOnClient("com.b", 42L, PortfolioActivityType.CREDIT));
        verify(eventPublisher).publishEvent(any());
    }
}
