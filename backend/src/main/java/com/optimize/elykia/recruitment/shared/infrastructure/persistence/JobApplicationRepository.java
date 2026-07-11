package com.optimize.elykia.recruitment.shared.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.recruitment.shared.domain.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JobApplicationRepository extends GenericRepository<JobApplication, Long> {

    Page<JobApplication> findByJobOfferIdOrderBySubmittedAtDesc(Long jobOfferId, Pageable pageable);

    Page<JobApplication> findAllByOrderBySubmittedAtDesc(Pageable pageable);
}
