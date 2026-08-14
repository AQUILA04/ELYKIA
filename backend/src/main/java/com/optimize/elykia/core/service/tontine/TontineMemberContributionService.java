package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.TontineMemberContributionByCommercialDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TontineMemberContributionService {

    private final TontineCollectionRepository tontineCollectionRepository;
    private final TontineMemberRepository tontineMemberRepository;

    @Transactional(readOnly = true)
    public List<TontineMemberContributionByCommercialDto> getByMember(Long memberId) {
        TontineMember member = tontineMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));
        String currentCollector = member.getClient().getTontineCollector();

        List<TontineMemberContributionByCommercialDto> result = new ArrayList<>(
                tontineCollectionRepository
                .sumContributionsByMemberAndCommercial(memberId, State.ENABLED)
                .stream()
                .map(row -> new TontineMemberContributionByCommercialDto(
                        row.getCommercialUsername(),
                        row.getCollectionsCount(),
                        row.getTotalAmount(),
                        currentCollector != null
                                && row.getCommercialUsername() != null
                                && currentCollector.equalsIgnoreCase(row.getCommercialUsername())))
                .toList());

        boolean currentCollectorPresent = result.stream()
                .anyMatch(TontineMemberContributionByCommercialDto::isCurrentCollector);
        if (!currentCollectorPresent && currentCollector != null && !currentCollector.isBlank()) {
            result.add(new TontineMemberContributionByCommercialDto(
                    currentCollector, 0L, 0.0, true));
        }
        return result;
    }
}
