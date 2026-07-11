package com.optimize.elykia.recruitment.shared.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.recruitment.shared.domain.JobOffer;
import com.optimize.elykia.recruitment.shared.domain.JobOfferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface JobOfferRepository extends GenericRepository<JobOffer, Long> {

    List<JobOffer> findByStatusAndStateOrderByDisplayOrderAsc(JobOfferStatus status, State state);

    Page<JobOffer> findByStateNot(State state, Pageable pageable);
}
