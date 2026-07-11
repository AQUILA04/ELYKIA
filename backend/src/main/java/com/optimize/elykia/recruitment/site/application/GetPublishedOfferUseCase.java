package com.optimize.elykia.recruitment.site.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobOfferRepository;
import com.optimize.elykia.recruitment.shared.mapper.RecruitmentMapper;
import com.optimize.elykia.recruitment.site.api.dto.PublishedJobOfferResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetPublishedOfferUseCase {

    private final JobOfferRepository jobOfferRepository;
    private final RecruitmentMapper recruitmentMapper;

    public PublishedJobOfferResponse execute(Long id) {
        JobOffer offer = jobOfferRepository.findByIdAndState(id, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("Offre introuvable"));
        if (offer.getStatus() != JobOfferStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Offre introuvable");
        }
        return recruitmentMapper.toPublishedResponse(offer);
    }
}
