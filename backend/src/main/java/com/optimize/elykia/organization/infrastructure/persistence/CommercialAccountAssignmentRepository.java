package com.optimize.elykia.organization.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.organization.domain.CommercialAccountAssignment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CommercialAccountAssignmentRepository extends GenericRepository<CommercialAccountAssignment, Long> {

    List<CommercialAccountAssignment> findByUserIdAndStateOrderByStartDateDesc(Long userId, State state);

    List<CommercialAccountAssignment> findByPromoterIdAndStateOrderByStartDateDesc(Long promoterId, State state);

    List<CommercialAccountAssignment> findByUserIdAndState(Long userId, State state);

    List<CommercialAccountAssignment> findByPromoterIdAndState(Long promoterId, State state);

    boolean existsByPromoterIdAndState(Long promoterId, State state);

    @Query("""
            select a from CommercialAccountAssignment a
            where a.state = :state
              and a.startDate <= :day
              and (a.endDate is null or a.endDate >= :day)
            """)
    List<CommercialAccountAssignment> findCovering(
            @Param("state") State state,
            @Param("day") LocalDate day);
}
