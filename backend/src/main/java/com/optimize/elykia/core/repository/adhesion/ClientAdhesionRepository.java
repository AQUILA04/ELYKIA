package com.optimize.elykia.core.repository.adhesion;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.adhesion.ClientAdhesion;
import com.optimize.elykia.core.enumaration.AdhesionStatus;
import com.optimize.elykia.core.enumaration.AdhesionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClientAdhesionRepository extends JpaRepository<ClientAdhesion, Long> {

    List<ClientAdhesion> findByClient_IdAndStateOrderByAdhesionTypeAsc(Long clientId, State state);

    Optional<ClientAdhesion> findByClient_IdAndAdhesionTypeAndStateAndStatusIn(
            Long clientId,
            AdhesionType adhesionType,
            State state,
            Collection<AdhesionStatus> statuses);

    @Query("""
            SELECT a FROM ClientAdhesion a
            WHERE a.client.collector = :collector
              AND a.state = :state
              AND a.status IN :statuses
            """)
    List<ClientAdhesion> findByCollectorAndStatuses(
            @Param("collector") String collector,
            @Param("state") State state,
            @Param("statuses") Collection<AdhesionStatus> statuses);
}
