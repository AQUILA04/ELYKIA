package com.optimize.elykia.core.repository.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.customer.CustomerAdhesionSubmission;
import com.optimize.elykia.core.enumaration.AdhesionRequestKind;
import com.optimize.elykia.core.enumaration.AdhesionType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
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
