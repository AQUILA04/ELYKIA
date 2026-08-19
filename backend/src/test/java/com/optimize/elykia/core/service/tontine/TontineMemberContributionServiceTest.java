package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontineMemberContributionByCommercialDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineMemberContributionServiceTest {

    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @Mock
    private TontineMemberRepository tontineMemberRepository;
    @InjectMocks
    private TontineMemberContributionService service;

    @Test
    void getByMember_marksCurrentCollectorCaseInsensitively() {
        // Given
        when(tontineMemberRepository.findById(1L)).thenReturn(Optional.of(memberWithCollector("collector.a")));
        when(tontineCollectionRepository.sumContributionsByMemberAndCommercial(1L, State.ENABLED))
                .thenReturn(List.of(
                        new TontineMemberContributionByCommercialDto("COLLECTOR.A", 3L, 75_000.0),
                        new TontineMemberContributionByCommercialDto("collector.b", 1L, 15_000.0)));

        // When
        List<TontineMemberContributionByCommercialDto> result = service.getByMember(1L);

        // Then
        assertEquals(2, result.size());
        assertEquals(List.of(true, false), result.stream()
                .map(TontineMemberContributionByCommercialDto::isCurrentCollector).toList());
        assertEquals(List.of(75_000.0, 15_000.0), result.stream()
                .map(TontineMemberContributionByCommercialDto::getTotalAmount).toList());
    }

    @Test
    void getByMember_addsZeroContributionLineWhenCurrentCollectorHasNoCollection() {
        // Given
        when(tontineMemberRepository.findById(2L)).thenReturn(Optional.of(memberWithCollector("collector.new")));
        when(tontineCollectionRepository.sumContributionsByMemberAndCommercial(2L, State.ENABLED))
                .thenReturn(List.of(new TontineMemberContributionByCommercialDto("collector.old", 2L, 40_000.0)));

        // When
        List<TontineMemberContributionByCommercialDto> result = service.getByMember(2L);

        // Then
        assertEquals(2, result.size());
        TontineMemberContributionByCommercialDto current = result.get(1);
        assertEquals("collector.new", current.getCommercialUsername());
        assertEquals(0L, current.getCollectionsCount());
        assertEquals(0.0, current.getTotalAmount());
        assertEquals(true, current.isCurrentCollector());
    }

    @Test
    void getByMember_rejectsUnknownMemberWithoutQueryingContributions() {
        // Given
        when(tontineMemberRepository.findById(3L)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () -> service.getByMember(3L));
        verify(tontineCollectionRepository, never()).sumContributionsByMemberAndCommercial(3L, State.ENABLED);
    }

    private TontineMember memberWithCollector(String collector) {
        Client client = new Client();
        client.setTontineCollector(collector);
        TontineMember member = new TontineMember();
        member.setClient(client);
        return member;
    }
}
