package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.agency.AgencyAssignment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AgencyAssignmentRepository extends GenericRepository<AgencyAssignment, Long> {

    @Query("SELECT aa FROM AgencyAssignment aa WHERE aa.userId = :userId AND aa.endDate IS NULL")
    Optional<AgencyAssignment> findActiveAssignmentByUserId(@Param("userId") Long userId);

    @Query("SELECT CASE WHEN COUNT(aa) > 0 THEN true ELSE false END FROM AgencyAssignment aa "
            + "WHERE aa.userId = :userId AND aa.endDate IS NULL")
    boolean existsActiveAssignment(@Param("userId") Long userId);

    @Query("SELECT aa.userId FROM AgencyAssignment aa WHERE aa.agency.id = :agencyId AND aa.endDate IS NULL")
    List<Long> findActiveUserIdsByAgencyId(@Param("agencyId") Long agencyId);

    @Query("SELECT COUNT(aa) FROM AgencyAssignment aa WHERE aa.userId = :userId AND aa.endDate IS NULL")
    long countActiveByUserId(@Param("userId") Long userId);

    List<AgencyAssignment> findByUserIdOrderByStartDateDesc(Long userId);

    List<AgencyAssignment> findByUserIdOrderByStartDateAsc(Long userId);
}
