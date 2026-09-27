package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.customer.CustomerInitialDepositSubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CustomerInitialDepositSubmissionRepository
        extends JpaRepository<CustomerInitialDepositSubmission, Long> {

    Optional<CustomerInitialDepositSubmission> findFirstByClientIdAndStatusInAndState(
            Long clientId, Collection<CustomerSubmissionStatus> statuses, State state);

    Optional<CustomerInitialDepositSubmission> findFirstByClientIdAndStatusAndState(
            Long clientId, CustomerSubmissionStatus status, State state);

    List<CustomerInitialDepositSubmission> findByClientIdInAndState(Collection<Long> clientIds, State state);

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM CustomerInitialDepositSubmission s
            WHERE s.clientId = :clientId
              AND s.status IN :statuses
              AND s.state = :state
            """)
    boolean existsActiveForClient(
            @Param("clientId") Long clientId,
            @Param("statuses") Collection<CustomerSubmissionStatus> statuses,
            @Param("state") State state);
}
