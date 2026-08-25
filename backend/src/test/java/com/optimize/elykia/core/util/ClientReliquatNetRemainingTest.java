package com.optimize.elykia.core.util;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.DailyUnrecoveredCreditDto;
import com.optimize.elykia.core.entity.sale.ClientReliquat;
import com.optimize.elykia.core.repository.ClientReliquatRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientReliquatNetRemainingTest {

    @Mock
    private ClientReliquatRepository clientReliquatRepository;

    @Test
    void loadAvailableByClient_returnsEmptyWhenNoClientIds() {
        Map<Long, Double> result = ClientReliquatNetRemaining.loadAvailableByClient(
                clientReliquatRepository, Set.of());

        assertTrue(result.isEmpty());
        verifyNoInteractions(clientReliquatRepository);
    }

    @Test
    void loadAvailableByClient_clampsNegativeBalanceAndSkipsMissingClient() {
        Client clientWithReliquat = new Client();
        clientWithReliquat.setId(10L);
        Client clientWithNegative = new Client();
        clientWithNegative.setId(11L);
        ClientReliquat positive = new ClientReliquat(clientWithReliquat, 150.0);
        ClientReliquat negative = new ClientReliquat(clientWithNegative, -20.0);
        ClientReliquat orphan = new ClientReliquat();
        orphan.setTotalAmount(80.0);
        when(clientReliquatRepository.findByClientIdIn(Set.of(10L, 11L)))
                .thenReturn(List.of(positive, negative, orphan));

        Map<Long, Double> result = ClientReliquatNetRemaining.loadAvailableByClient(
                clientReliquatRepository, Set.of(10L, 11L));

        assertEquals(2, result.size());
        assertEquals(150.0, result.get(10L));
        assertEquals(0.0, result.get(11L));
    }

    @Test
    void consume_allocatesReliquatAcrossCreditsWithoutDoubleCounting() {
        Map<Long, Double> remainingReliquat = new HashMap<>();
        remainingReliquat.put(7L, 400.0);

        double firstApplied = ClientReliquatNetRemaining.consume(remainingReliquat, 7L, 250.0);
        double firstNet = 250.0 - firstApplied;
        double secondApplied = ClientReliquatNetRemaining.consume(remainingReliquat, 7L, 200.0);
        double secondNet = 200.0 - secondApplied;

        assertEquals(250.0, firstApplied);
        assertEquals(0.0, firstNet);
        assertEquals(150.0, secondApplied);
        assertEquals(50.0, secondNet);
        assertEquals(0.0, remainingReliquat.get(7L));
    }

    @Test
    void consume_returnsZeroWhenNoBalanceOrNullClient() {
        Map<Long, Double> remainingReliquat = new HashMap<>();
        remainingReliquat.put(3L, 100.0);

        assertEquals(0.0, ClientReliquatNetRemaining.consume(remainingReliquat, null, 80.0));
        assertEquals(0.0, ClientReliquatNetRemaining.consume(remainingReliquat, 99L, 80.0));
        assertEquals(0.0, ClientReliquatNetRemaining.consume(remainingReliquat, 3L, 0.0));
        assertEquals(100.0, remainingReliquat.get(3L));
    }

    @Test
    void applyToDailyCredits_netsRemainingLikeCreditLatePdf() {
        Client client = new Client();
        client.setId(7L);
        when(clientReliquatRepository.findByClientIdIn(org.mockito.ArgumentMatchers.any()))
                .thenReturn(List.of(new ClientReliquat(client, 400.0)));

        DailyUnrecoveredCreditDto first = dailyCredit(1L, 7L, 250.0);
        DailyUnrecoveredCreditDto second = dailyCredit(2L, 7L, 200.0);

        ClientReliquatNetRemaining.applyToDailyCredits(clientReliquatRepository, List.of(first, second));

        assertEquals(0.0, first.getTotalAmountRemaining());
        assertEquals(50.0, second.getTotalAmountRemaining());
    }

    private static DailyUnrecoveredCreditDto dailyCredit(Long id, Long clientId, double remaining) {
        DailyUnrecoveredCreditDto dto = new DailyUnrecoveredCreditDto();
        dto.setId(id);
        dto.setClientId(clientId);
        dto.setTotalAmountRemaining(remaining);
        return dto;
    }
}
