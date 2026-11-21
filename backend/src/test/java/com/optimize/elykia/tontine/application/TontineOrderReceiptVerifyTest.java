package com.optimize.elykia.tontine.application;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.tontine.web.dto.TontineOrderReceiptVerificationDto;
import com.optimize.elykia.tontine.domain.TontineDelivery;
import com.optimize.elykia.tontine.domain.TontineMember;
import com.optimize.elykia.tontine.domain.TontineMemberDeliveryStatus;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Vérification d'un reçu de commande tontine, y compris celui d'une commande fusionnée. */
@ExtendWith(MockitoExtension.class)
class TontineOrderReceiptVerifyTest {

    @Mock
    private TontineDeliveryRepository deliveryRepository;
    @Mock
    private TontineDeliveryConflictService conflictService;
    @Mock
    private UserService userService;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TontineOrderReceiptPdfService service;

    private TontineDelivery merged;

    @BeforeEach
    void setUp() {
        Client client = new Client();
        client.setFirstname("Ama");
        client.setLastname("KOFFI");
        TontineMember member = new TontineMember();
        member.setClient(client);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);

        merged = new TontineDelivery();
        merged.setId(20L);
        merged.setReference("LIV-A");
        merged.setAuthenticityCode("ELY-AAAA-1111");
        merged.setTontineMember(member);
        merged.setTotalAmount(80_000.0);
        merged.setRequestDate(LocalDateTime.of(2026, 11, 2, 9, 0));
        merged.setCommercialUsername("COM005");
        merged.setItems(new ArrayList<>());

        User manager = mock(User.class);
        lenient().when(manager.is(anyString())).thenReturn(false);
        lenient().when(userService.getCurrentUser()).thenReturn(manager);
        lenient().when(userRepository.findByUserAccount_usernameIgnoreCase(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void verify_recognisesTheReceiptOfAnOrderMergedIntoAnotherOne() {
        when(deliveryRepository.findByAuthenticityCode("ELY-BBBB-2222")).thenReturn(Optional.empty());
        when(conflictService.mergedDeliveryIdForReceiptCode("ELY-BBBB-2222")).thenReturn(Optional.of(20L));
        when(deliveryRepository.findById(20L)).thenReturn(Optional.of(merged));

        TontineOrderReceiptVerificationDto result = service.verify(" ely-bbbb-2222 ");

        assertTrue(result.isFound());
        assertEquals("LIV-A", result.getReference());
        assertEquals("ELY-AAAA-1111", result.getAuthenticityCode());
        assertTrue(result.getMessage().contains("LIV-A"));
        assertTrue(result.getMessage().contains("authentique"));
    }

    @Test
    void verify_keepsAnUnknownCodeUnknown() {
        when(deliveryRepository.findByAuthenticityCode("ELY-CCCC-3333")).thenReturn(Optional.empty());
        when(conflictService.mergedDeliveryIdForReceiptCode("ELY-CCCC-3333")).thenReturn(Optional.empty());

        TontineOrderReceiptVerificationDto result = service.verify("ELY-CCCC-3333");

        assertFalse(result.isFound());
        verify(deliveryRepository, never()).findById(any());
    }

    @Test
    void verify_readsTheDeliveryDirectlyWithoutLookingAtTheJournal() {
        when(deliveryRepository.findByAuthenticityCode("ELY-AAAA-1111")).thenReturn(Optional.of(merged));

        TontineOrderReceiptVerificationDto result = service.verify("ELY-AAAA-1111");

        assertTrue(result.isFound());
        assertNull(result.getMessage());
        verifyNoInteractions(conflictService);
    }

    private static <T> T any() {
        return org.mockito.ArgumentMatchers.any();
    }
}
