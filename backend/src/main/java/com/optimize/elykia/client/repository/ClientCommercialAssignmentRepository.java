package com.optimize.elykia.client.repository;

import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.entity.ClientCommercialAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientCommercialAssignmentRepository extends JpaRepository<ClientCommercialAssignment, Long> {

    List<ClientCommercialAssignment> findByClientIdOrderByActivityTypeAscPrimaryDescStatusAscCommercialUsernameAsc(Long clientId);

    List<ClientCommercialAssignment> findByClientIdAndActivityTypeOrderByPrimaryDescStatusAscIdAsc(
            Long clientId, PortfolioActivityType activityType);

    Optional<ClientCommercialAssignment> findByClientIdAndCommercialUsernameIgnoreCaseAndActivityType(
            Long clientId, String commercialUsername, PortfolioActivityType activityType);

    boolean existsByClientIdAndCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(
            Long clientId, String commercialUsername, PortfolioActivityType activityType,
            CommercialAssignmentStatus status);

    List<ClientCommercialAssignment> findByCommercialUsernameIgnoreCaseAndActivityTypeAndStatus(
            String commercialUsername, PortfolioActivityType activityType, CommercialAssignmentStatus status);
}
