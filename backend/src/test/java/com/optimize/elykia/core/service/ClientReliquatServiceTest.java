package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.entity.sale.ClientReliquat;
import com.optimize.elykia.core.repository.ClientReliquatRepository;
import com.optimize.elykia.core.service.sale.ClientReliquatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientReliquatServiceTest {

    private static final Long CLIENT_ID = 42L;
    private static final LocalDate ACCOUNTED_DATE = LocalDate.of(2026, 8, 19);

    @Mock
    private ClientReliquatRepository clientReliquatRepository;
    @Mock
    private ClientRepository clientRepository;
    @InjectMocks
    private ClientReliquatService clientReliquatService;

    private Client client;

    @BeforeEach
    void setUp() {
        client = new Client();
        client.setId(CLIENT_ID);
        client.setCollector("commercial.a");
    }

    @Test
    void addReliquat_rejectsZeroOrNegativeAmountBeforeAccessingPersistence() {
        // When / Then
        assertThrows(ApplicationException.class,
                () -> clientReliquatService.addReliquat(CLIENT_ID, 0.0, "MOB-000", ACCOUNTED_DATE));
        assertThrows(ApplicationException.class,
                () -> clientReliquatService.addReliquat(CLIENT_ID, -5.0, "MOB-000", ACCOUNTED_DATE));
        verifyNoInteractions(clientReliquatRepository, clientRepository);
    }

    @Test
    void consumeReliquat_rejectsZeroOrNegativeAmountBeforeAccessingPersistence() {
        // When / Then
        assertThrows(ApplicationException.class,
                () -> clientReliquatService.consumeReliquat(CLIENT_ID, 0.0, "MOB-000", ACCOUNTED_DATE));
        assertThrows(ApplicationException.class,
                () -> clientReliquatService.consumeReliquat(CLIENT_ID, -5.0, "MOB-000", ACCOUNTED_DATE));
        verifyNoInteractions(clientReliquatRepository);
    }

    @Test
    void addReliquat_incrementsExistingBalanceAndTracksLastMobileRecovery() {
        // Given
        ClientReliquat existing = reliquat(client, 40.0);
        when(clientReliquatRepository.findByClientId(CLIENT_ID)).thenReturn(Optional.of(existing));
        when(clientReliquatRepository.save(existing)).thenReturn(existing);

        // When
        ClientReliquat result = clientReliquatService.addReliquat(CLIENT_ID, 15.0, "MOB-001", ACCOUNTED_DATE);

        // Then
        assertSame(existing, result);
        assertEquals(55.0, result.getTotalAmount());
        assertEquals("MOB-001", result.getLastRecoveryId());
        assertEquals(ACCOUNTED_DATE, result.getLastAccountedDate());
        verify(clientReliquatRepository).save(existing);
        verify(clientRepository, never()).findById(any());
    }

    @Test
    void addReliquat_createsBalanceForKnownClient() {
        // Given
        when(clientReliquatRepository.findByClientId(CLIENT_ID)).thenReturn(Optional.empty());
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(clientReliquatRepository.save(any(ClientReliquat.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        ClientReliquat result = clientReliquatService.addReliquat(CLIENT_ID, 35.0, "MOB-002", null);

        // Then
        assertSame(client, result.getClient());
        assertEquals(35.0, result.getTotalAmount());
        assertEquals("MOB-002", result.getLastRecoveryId());
        verify(clientRepository).findById(CLIENT_ID);
    }

    @Test
    void addReliquat_rejectsUnknownClientWhenNoBalanceExists() {
        // Given
        when(clientReliquatRepository.findByClientId(CLIENT_ID)).thenReturn(Optional.empty());
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class,
                () -> clientReliquatService.addReliquat(CLIENT_ID, 35.0, "MOB-003", ACCOUNTED_DATE));
        verify(clientReliquatRepository, never()).save(any());
    }

    @Test
    void consumeReliquat_capsConsumptionAtAvailableBalanceAndNeverCreatesNegativeBalance() {
        // Given
        ClientReliquat existing = reliquat(client, 60.0);
        when(clientReliquatRepository.findByClientId(CLIENT_ID)).thenReturn(Optional.of(existing));
        when(clientReliquatRepository.save(existing)).thenReturn(existing);

        // When
        ClientReliquat result = clientReliquatService.consumeReliquat(CLIENT_ID, 100.0, "MOB-004", ACCOUNTED_DATE);

        // Then
        assertEquals(0.0, result.getTotalAmount());
        assertEquals("MOB-004", result.getLastRecoveryId());
        assertEquals(ACCOUNTED_DATE, result.getLastAccountedDate());
        verify(clientReliquatRepository).save(existing);
    }

    @Test
    void consumeReliquat_rejectsMissingBalance() {
        // Given
        when(clientReliquatRepository.findByClientId(CLIENT_ID)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class,
                () -> clientReliquatService.consumeReliquat(CLIENT_ID, 10.0, "MOB-005", ACCOUNTED_DATE));
        verify(clientReliquatRepository, never()).save(any());
    }

    @Test
    void getReliquatForClient_returnsZeroWhenNoBalanceExists() {
        // Given
        when(clientReliquatRepository.findByClientId(CLIENT_ID)).thenReturn(Optional.empty());

        // When
        double result = clientReliquatService.getReliquatForClient(CLIENT_ID);

        // Then
        assertEquals(0.0, result);
    }

    @Test
    void findByCommercial_returnsOnlyBalancesBelongingToCollector() {
        // Given
        Client secondClient = new Client();
        secondClient.setId(43L);
        secondClient.setCollector("commercial.b");
        when(clientReliquatRepository.findAll()).thenReturn(List.of(
                reliquat(client, 20.0), reliquat(secondClient, 30.0)));

        // When
        List<ClientReliquat> result = clientReliquatService.findByCommercial("commercial.a");

        // Then
        assertEquals(1, result.size());
        assertSame(client, result.get(0).getClient());
        assertEquals(20.0, result.get(0).getTotalAmount());
    }

    private ClientReliquat reliquat(Client reliquatClient, double amount) {
        return new ClientReliquat(reliquatClient, amount);
    }
}
