package com.optimize.elykia.recruitment.site.application;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobOfferRepository;
import com.optimize.elykia.recruitment.shared.mapper.RecruitmentMapper;
import com.optimize.elykia.recruitment.site.api.dto.PublishedJobOfferResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ListPublishedOffersUseCase {

    private final JobOfferRepository jobOfferRepository;
    private final RecruitmentMapper recruitmentMapper;

    public List<PublishedJobOfferResponse> execute() {
        return jobOfferRepository.findByStatusAndStateOrderByDisplayOrderAsc(JobOfferStatus.PUBLISHED, State.ENABLED)
                .stream()
                .map(recruitmentMapper::toPublishedResponse)
                .toList();
    }
}
