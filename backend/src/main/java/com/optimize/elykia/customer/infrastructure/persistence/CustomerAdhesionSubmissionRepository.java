package com.optimize.elykia.customer.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.customer.domain.CustomerAdhesionSubmission;
import com.optimize.elykia.customer.domain.AdhesionRequestKind;
import com.optimize.elykia.customer.domain.AdhesionType;
import com.optimize.elykia.customer.domain.CustomerSubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerAdhesionSubmissionRepository extends JpaRepository<CustomerAdhesionSubmission, Long> {

    List<CustomerAdhesionSubmission> findByClientIdAndStateOrderByIdDesc(Long clientId, State state);

    Optional<CustomerAdhesionSubmission> findByClientIdAndAdhesionTypeAndRequestKindAndStatusAndState(
            Long clientId,
            AdhesionType adhesionType,
            AdhesionRequestKind requestKind,
            CustomerSubmissionStatus status,
            State state);
}
