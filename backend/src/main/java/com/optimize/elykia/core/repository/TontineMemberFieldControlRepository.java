package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface TontineMemberFieldControlRepository extends GenericRepository<TontineMemberFieldControl, Long> {

    @EntityGraph(attributePaths = "lines")
    Optional<TontineMemberFieldControl> findFirstByTontineMember_idAndStateOrderByObservedAtDesc(
            Long tontineMemberId, State state);

    @EntityGraph(attributePaths = "lines")
    List<TontineMemberFieldControl> findByTontineMember_idAndStateOrderByObservedAtDesc(
            Long tontineMemberId, State state);

    boolean existsByReference(String reference);

    @EntityGraph(attributePaths = "lines")
    Optional<TontineMemberFieldControl> findByReference(String reference);
}
