package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;

import java.util.List;

public interface CustomerMobileMoneySubmissionRepository extends GenericRepository<CustomerMobileMoneySubmission, Long> {

    List<CustomerMobileMoneySubmission> findByCreditIdAndStatus(Long creditId, CustomerSubmissionStatus status);

    List<CustomerMobileMoneySubmission> findByClientIdOrderByCreatedDateDesc(Long clientId);
}
