package com.optimize.elykia.core.service.util;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.ClientAccountMovement;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.repository.ClientAccountMovementRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ClientAccountServiceTest {

    @Mock private ClientAccountMovementRepository movementRepository;
    @Mock private Client client;
    @Mock private TontineDelivery delivery;

    @Test
    void recordMovement_persistsCompleteClientAccountTraceForTontineDelivery() {
        // Given
        ClientAccountService service = new ClientAccountService(movementRepository);
        ArgumentCaptor<ClientAccountMovement> movementCaptor = ArgumentCaptor.forClass(ClientAccountMovement.class);

        // When
        service.recordMovement(client, 12_500.0, "TONTINE_DELIVERY", delivery);

        // Then
        verify(movementRepository).save(movementCaptor.capture());
        ClientAccountMovement movement = movementCaptor.getValue();
        assertSame(client, movement.getClient());
        assertEquals(12_500.0, movement.getAmount());
        assertEquals("TONTINE_DELIVERY", movement.getMovementType());
        assertSame(delivery, movement.getTontineDelivery());
        assertEquals(LocalDate.now(), movement.getCreationDate());
    }
}
