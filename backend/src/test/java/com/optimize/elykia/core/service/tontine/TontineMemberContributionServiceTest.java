package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontineMemberContributionByCommercialDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineMemberContributionServiceTest {

    @Mock private TontineCollectionRepository tontineCollectionRepository;
    @Mock private TontineMemberRepository tontineMemberRepository;

    private TontineMemberContributionService service;

    @BeforeEach
    void setUp() {
        service = new TontineMemberContributionService(
                tontineCollectionRepository, tontineMemberRepository);
    }

    @Test
    void getByMember_marksCurrentCollectorAndKeepsHistoricalAmounts() {
        Client client = new Client();
        client.setTontineCollector("COM_B");
        TontineMember member = new TontineMember();
        member.setClient(client);

        when(tontineMemberRepository.findById(42L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.sumContributionsByMemberAndCommercial(
                42L, State.ENABLED))
                .thenReturn(List.of(
                        new TontineMemberContributionByCommercialDto("COM_A", 6L, 60_000.0),
                        new TontineMemberContributionByCommercialDto("COM_B", 4L, 40_000.0)));

        List<TontineMemberContributionByCommercialDto> result = service.getByMember(42L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTotalAmount()).isEqualTo(60_000.0);
        assertThat(result.get(0).isCurrentCollector()).isFalse();
        assertThat(result.get(1).getTotalAmount()).isEqualTo(40_000.0);
        assertThat(result.get(1).isCurrentCollector()).isTrue();
    }
}
