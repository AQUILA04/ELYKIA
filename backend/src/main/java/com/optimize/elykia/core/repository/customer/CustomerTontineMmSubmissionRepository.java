package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.customer.CustomerTontineMmSubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerTontineMmSubmissionRepository
        extends GenericRepository<CustomerTontineMmSubmission, Long> {

    List<CustomerTontineMmSubmission> findByTontineMemberIdAndStatusOrderByCreatedDateDesc(
            Long tontineMemberId, CustomerSubmissionStatus status);

    List<CustomerTontineMmSubmission> findByClientIdAndStatusOrderByCreatedDateDesc(
            Long clientId, CustomerSubmissionStatus status);

    @Query("""
            SELECT s FROM CustomerTontineMmSubmission s
            WHERE s.state = :state
              AND (:status IS NULL OR s.status = :status)
            ORDER BY s.createdDate DESC, s.id DESC
            """)
    Page<CustomerTontineMmSubmission> findByStatusOptional(
            @Param("status") CustomerSubmissionStatus status,
            @Param("state") State state,
            Pageable pageable);
}
