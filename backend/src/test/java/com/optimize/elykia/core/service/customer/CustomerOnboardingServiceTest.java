package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.enumeration.PhotoType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.CustomerIdDocumentRequest;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositDto;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositRequest;
import com.optimize.elykia.core.dto.customer.CustomerMobileMoneyRecipientDto;
import com.optimize.elykia.core.dto.customer.CustomerOnboardingStatusDto;
import com.optimize.elykia.core.entity.customer.CustomerInitialDepositSubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.customer.CustomerInitialDepositSubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Base64;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerOnboardingServiceTest {

    @Mock private CustomerContextService contextService;
    @Mock private ClientRepository clientRepository;
    @Mock private ClientService clientService;
    @Mock private CustomerInitialDepositSubmissionRepository depositRepository;
    @Mock private CommercialMobileMoneyConfigService commercialMobileMoneyConfigService;

    @InjectMocks
    private CustomerOnboardingService service;

    private Client pendingClient;

    @BeforeEach
    void setUp() {
        pendingClient = new Client();
        pendingClient.setId(10L);
        pendingClient.setFirstname("Ada");
        pendingClient.setLastname("Lovelace");
        pendingClient.setPhone("90123456");
        pendingClient.setActivationStatus(ClientActivationStatus.PENDING);
        pendingClient.setCardType("CENI");
        pendingClient.setCardID("ID-1");
    }

    @Test
    void assertPortalFeatureAllowed_blocksPending() {
        assertThrows(CustomValidationException.class, () -> service.assertPortalFeatureAllowed(pendingClient));
    }

    @Test
    void assertPortalFeatureAllowed_blocksRejected() {
        Client client = new Client();
        client.setActivationStatus(ClientActivationStatus.REJECTED);
        assertThrows(CustomValidationException.class, () -> service.assertPortalFeatureAllowed(client));
    }

    @Test
    void assertPortalFeatureAllowed_allowsActive() {
        Client client = new Client();
        client.setActivationStatus(ClientActivationStatus.ACTIVE);
        assertDoesNotThrow(() -> service.assertPortalFeatureAllowed(client));
    }

    @Test
    void assertPortalFeatureAllowed_allowsNull() {
        assertDoesNotThrow(() -> service.assertPortalFeatureAllowed(null));
    }

    @Test
    void getStatus_returnsPendingWithoutDeposit() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        when(depositRepository.findByClientIdInAndState(List.of(10L), State.ENABLED)).thenReturn(List.of());

        CustomerOnboardingStatusDto status = service.getStatus();

        assertEquals("PENDING", status.getActivationStatus());
        assertEquals("NONE", status.getInitialDepositStatus());
        assertFalse(status.isIdDocumentUploaded());
        assertEquals("Ada Lovelace", status.getFullName());
    }

    @Test
    void getStatus_includesInitieDeposit() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        CustomerInitialDepositSubmission deposit = new CustomerInitialDepositSubmission();
        deposit.setId(3L);
        deposit.setClientId(10L);
        deposit.setStatus(CustomerSubmissionStatus.INITIE);
        deposit.setMobileMoneyAmount(25_000.0);
        when(depositRepository.findByClientIdInAndState(List.of(10L), State.ENABLED)).thenReturn(List.of(deposit));
        pendingClient.setCardPhotoUrl("https://cdn/card.jpg");

        CustomerOnboardingStatusDto status = service.getStatus();

        assertEquals("INITIE", status.getInitialDepositStatus());
        assertEquals(25_000.0, status.getInitialDepositAmount());
        assertTrue(status.isIdDocumentUploaded());
    }

    @Test
    void getInitialDepositRecipients_requiresPending() {
        Client active = new Client();
        active.setActivationStatus(ClientActivationStatus.ACTIVE);
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(active);

        assertThrows(CustomValidationException.class, () -> service.getInitialDepositRecipients());
    }

    @Test
    void getInitialDepositRecipients_delegatesToConfig() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        CustomerMobileMoneyRecipientDto recipients = CustomerMobileMoneyRecipientDto.builder()
                .mixxNumber("90111111")
                .moovNumber("90222222")
                .build();
        when(commercialMobileMoneyConfigService.resolveForCollector(null)).thenReturn(recipients);

        assertEquals(recipients, service.getInitialDepositRecipients());
    }

    @Test
    void submitInitialDeposit_createsInitieSubmission() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        when(depositRepository.existsActiveForClient(
                eq(10L),
                eq(EnumSet.of(CustomerSubmissionStatus.INITIE, CustomerSubmissionStatus.VALIDE)),
                eq(State.ENABLED))).thenReturn(false);
        when(depositRepository.save(any())).thenAnswer(inv -> {
            CustomerInitialDepositSubmission s = inv.getArgument(0);
            s.setId(99L);
            return s;
        });

        CustomerInitialDepositRequest request = new CustomerInitialDepositRequest();
        request.setMobileMoneyPhone("90123456");
        request.setMobileMoneyAmount(50_000.0);
        request.setMobileMoneyReference("REF-1");
        request.setNotes("depot");

        CustomerInitialDepositDto dto = service.submitInitialDeposit(request);

        assertEquals(99L, dto.getId());
        assertEquals(CustomerSubmissionStatus.INITIE, dto.getStatus());
        assertEquals(50_000.0, dto.getMobileMoneyAmount());
        ArgumentCaptor<CustomerInitialDepositSubmission> captor =
                ArgumentCaptor.forClass(CustomerInitialDepositSubmission.class);
        verify(depositRepository).save(captor.capture());
        assertEquals("REF-1", captor.getValue().getMobileMoneyReference());
    }

    @Test
    void submitInitialDeposit_rejectsWhenAlreadyActiveDeposit() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        when(depositRepository.existsActiveForClient(any(), any(), eq(State.ENABLED))).thenReturn(true);

        CustomerInitialDepositRequest request = new CustomerInitialDepositRequest();
        request.setMobileMoneyPhone("90123456");
        request.setMobileMoneyAmount(50_000.0);
        request.setMobileMoneyReference("REF-1");

        assertThrows(CustomValidationException.class, () -> service.submitInitialDeposit(request));
    }

    @Test
    void getInitialDeposit_returnsEmptyWhenNone() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        when(depositRepository.findByClientIdInAndState(List.of(10L), State.ENABLED)).thenReturn(List.of());

        assertTrue(service.getInitialDeposit().isEmpty());
    }

    @Test
    void uploadIdDocument_updatesCardAndUploadsPhoto() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);
        when(clientRepository.existsByCardIDAndIdNot("NEW-ID", 10L)).thenReturn(false);
        when(clientRepository.save(pendingClient)).thenReturn(pendingClient);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(pendingClient));
        when(depositRepository.findByClientIdInAndState(List.of(10L), State.ENABLED)).thenReturn(List.of());

        CustomerIdDocumentRequest request = new CustomerIdDocumentRequest();
        request.setCardType("Passport");
        request.setCardID("NEW-ID");
        request.setCardPhoto(longBase64Photo());

        CustomerOnboardingStatusDto status = service.uploadIdDocument(request);

        assertEquals("Passport", pendingClient.getCardType());
        assertEquals("NEW-ID", pendingClient.getCardID());
        verify(clientService).uploadPhotoWithThumb(eq(10L), any(byte[].class), eq(PhotoType.CARD));
        assertEquals("PENDING", status.getActivationStatus());
    }

    @Test
    void uploadIdDocument_rejectsEmptyPhoto() {
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(pendingClient);

        CustomerIdDocumentRequest request = new CustomerIdDocumentRequest();
        request.setCardPhoto("short");

        assertThrows(CustomValidationException.class, () -> service.uploadIdDocument(request));
    }

    private static String longBase64Photo() {
        byte[] bytes = new byte[800];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) (i % 127);
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
}
