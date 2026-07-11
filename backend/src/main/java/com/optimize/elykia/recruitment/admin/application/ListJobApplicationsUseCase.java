package com.optimize.elykia.recruitment.admin.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.recruitment.admin.api.dto.JobApplicationAdminDto;
import com.optimize.elykia.recruitment.shared.domain.JobApplication;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobApplicationRepository;
import com.optimize.elykia.recruitment.shared.infrastructure.persistence.JobOfferRepository;
import com.optimize.elykia.recruitment.shared.mapper.RecruitmentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ListJobApplicationsUseCase {

    private final JobApplicationRepository jobApplicationRepository;
    private final JobOfferRepository jobOfferRepository;
    private final RecruitmentMapper recruitmentMapper;

    public Page<JobApplicationAdminDto> list(Long jobOfferId, Pageable pageable) {
        Page<JobApplication> page = jobOfferId != null
                ? jobApplicationRepository.findByJobOfferIdOrderBySubmittedAtDesc(jobOfferId, pageable)
                : jobApplicationRepository.findAllByOrderBySubmittedAtDesc(pageable);
        return page.map(app -> recruitmentMapper.toAdminDto(app, resolveOfferTitle(app.getJobOfferId())));
    }

    public JobApplicationAdminDto getById(Long id) {
        JobApplication application = jobApplicationRepository.findById(id)
                .filter(a -> a.getState() != State.DELETED)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));
        return recruitmentMapper.toAdminDto(application, resolveOfferTitle(application.getJobOfferId()));
    }

    private String resolveOfferTitle(Long jobOfferId) {
        return jobOfferRepository.findById(jobOfferId)
                .map(JobOffer::getTitle)
                .orElse("—");
    }
}
