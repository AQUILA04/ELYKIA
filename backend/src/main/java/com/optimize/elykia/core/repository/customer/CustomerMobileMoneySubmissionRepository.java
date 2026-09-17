package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerMobileMoneySubmissionRepository extends GenericRepository<CustomerMobileMoneySubmission, Long> {

    List<CustomerMobileMoneySubmission> findByCreditIdAndStatus(Long creditId, CustomerSubmissionStatus status);

    List<CustomerMobileMoneySubmission> findByClientIdOrderByCreatedDateDesc(Long clientId);

    @Query("""
            SELECT s FROM CustomerMobileMoneySubmission s
            WHERE s.state = :state
              AND (:status IS NULL OR s.status = :status)
            ORDER BY s.createdDate DESC, s.id DESC
            """)
    Page<CustomerMobileMoneySubmission> findByStatusOptional(
            @Param("status") CustomerSubmissionStatus status,
            @Param("state") State state,
            Pageable pageable);
}
