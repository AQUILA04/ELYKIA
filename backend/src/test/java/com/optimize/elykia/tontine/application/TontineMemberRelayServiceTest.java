package com.optimize.elykia.tontine.application;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.application.ClientCommercialPortfolioService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.tontine.domain.TontineMember;
import com.optimize.elykia.tontine.domain.TontineMemberCommercialAssignment;
import com.optimize.elykia.tontine.domain.TontineMemberStewardshipRole;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineCollectionRepository;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineMemberCommercialAssignmentRepository;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TontineMemberRelayServiceTest {

    private TontineMemberCommercialAssignmentRepository assignmentRepository;
    private TontineMemberRepository memberRepository;
    private TontineCollectionRepository collectionRepository;
    private ClientCommercialPortfolioService clientPortfolioService;
    private UserService userService;
    private TontineMemberRelayService service;

    private final List<TontineMemberCommercialAssignment> store = new ArrayList<>();
    private TontineMember member;

    @BeforeEach
    void setUp() {
        assignmentRepository = mock(TontineMemberCommercialAssignmentRepository.class);
        memberRepository = mock(TontineMemberRepository.class);
        collectionRepository = mock(TontineCollectionRepository.class);
        clientPortfolioService = mock(ClientCommercialPortfolioService.class);
        userService = mock(UserService.class);

        User actor = mock(User.class);
        when(actor.getUsername()).thenReturn("manager.1");
        when(userService.getCurrentUser()).thenReturn(actor);

        Client client = new Client();
        client.setId(42L);
        member = new TontineMember();
        member.setId(100L);
        member.setClient(client);
        when(memberRepository.findById(100L)).thenReturn(Optional.of(member));
        when(collectionRepository.sumContributionsByMemberAndCommercial(any(), any())).thenReturn(List.of());

        when(assignmentRepository.save(any())).thenAnswer(inv -> {
            TontineMemberCommercialAssignment a = inv.getArgument(0);
            if (!store.contains(a)) {
                store.add(a);
            }
            return a;
        });
        when(assignmentRepository.findByTontineMemberIdOrderByStatusAscEffectiveFromAscIdAsc(100L))
                .thenAnswer(inv -> new ArrayList<>(store));
        when(assignmentRepository.findByTontineMemberIdAndCommercialUsernameIgnoreCase(any(), any()))
                .thenAnswer(inv -> {
                    String u = inv.getArgument(1);
                    return store.stream().filter(a -> a.getCommercialUsername().equalsIgnoreCase(u)).findFirst();
                });
        when(assignmentRepository.existsByTontineMemberIdAndCommercialUsernameIgnoreCaseAndStatus(any(), any(), any()))
                .thenAnswer(inv -> {
                    String u = inv.getArgument(1);
                    CommercialAssignmentStatus st = inv.getArgument(2);
                    return store.stream().anyMatch(
                            a -> a.getCommercialUsername().equalsIgnoreCase(u) && a.getStatus() == st);
                });
        when(assignmentRepository.findByCommercialUsernameIgnoreCaseAndStatus(any(), any()))
                .thenAnswer(inv -> {
                    String u = inv.getArgument(0);
                    CommercialAssignmentStatus st = inv.getArgument(1);
                    return store.stream()
                            .filter(a -> a.getCommercialUsername().equalsIgnoreCase(u) && a.getStatus() == st)
                            .toList();
                });

        service = new TontineMemberRelayService(assignmentRepository, memberRepository, collectionRepository,
                clientPortfolioService, userService);
    }

    @Test
    void initiatorToRelayToReactivation_allowsContinuationWithoutDestructiveTransfer() {
        TontineMemberCommercialAssignment init = service.assignOrRelayMember(100L, "com.a", false, "Ouverture carnet");
        assertEquals(TontineMemberStewardshipRole.INITIATOR, init.getRole());
        assertTrue(service.canCommercialOperateOnMember("com.a", member));

        // Relais en masse de com.a vers com.b
        int count = service.bulkRelayMembers("com.a", "com.b", null, true, "Relais zone");
        assertEquals(1, count);
        assertFalse(init.isActive());
        assertTrue(service.canCommercialOperateOnMember("com.b", member));
        verify(clientPortfolioService).assignOrRelay(42L, "com.b", PortfolioActivityType.TONTINE, true, true,
                "Relais zone");

        // Réactivation de com.a en co-collecteur
        service.assignOrRelayMember(100L, "com.a", false, "Retour com.a");
        assertTrue(service.canCommercialOperateOnMember("com.a", member));
        assertTrue(service.canCommercialOperateOnMember("com.b", member));
    }
}
