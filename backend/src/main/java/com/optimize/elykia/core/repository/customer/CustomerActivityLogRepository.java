package com.optimize.elykia.core.repository.customer;

import com.optimize.elykia.core.entity.customer.CustomerActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface CustomerActivityLogRepository
        extends JpaRepository<CustomerActivityLog, Long>, JpaSpecificationExecutor<CustomerActivityLog> {

    boolean existsByEventId(UUID eventId);

    @Query("SELECT e.eventId FROM CustomerActivityLog e WHERE e.eventId IN :ids")
    Set<UUID> findExistingEventIds(@Param("ids") Collection<UUID> ids);

    @Modifying
    @Query("DELETE FROM CustomerActivityLog e WHERE e.occurredAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);

    @Query("""
            SELECT e FROM CustomerActivityLog e
            WHERE e.sessionId = :sessionId
              AND (:from IS NULL OR e.occurredAt >= :from)
              AND (:to IS NULL OR e.occurredAt <= :to)
            ORDER BY e.occurredAt ASC
            """)
    List<CustomerActivityLog> findSessionTimeline(
            @Param("sessionId") String sessionId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);
}
