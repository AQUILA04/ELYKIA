package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.client.api.CommercialAssignmentStatus;
import com.optimize.elykia.tontine.domain.TontineMemberCommercialAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TontineMemberCommercialAssignmentRepository extends JpaRepository<TontineMemberCommercialAssignment, Long> {

    List<TontineMemberCommercialAssignment> findByTontineMemberIdOrderByStatusAscEffectiveFromAscIdAsc(Long tontineMemberId);

    Optional<TontineMemberCommercialAssignment> findByTontineMemberIdAndCommercialUsernameIgnoreCase(
            Long tontineMemberId, String commercialUsername);

    boolean existsByTontineMemberIdAndCommercialUsernameIgnoreCaseAndStatus(
            Long tontineMemberId, String commercialUsername, CommercialAssignmentStatus status);

    List<TontineMemberCommercialAssignment> findByCommercialUsernameIgnoreCaseAndStatus(
            String commercialUsername, CommercialAssignmentStatus status);
}
