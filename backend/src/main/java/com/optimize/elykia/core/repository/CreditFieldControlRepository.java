package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CreditFieldControlRepository extends GenericRepository<CreditFieldControl, Long> {
    Optional<CreditFieldControl> findFirstByCredit_idAndStateOrderByObservedAtDesc(Long creditId, State state);

    List<CreditFieldControl> findByCredit_idAndStateOrderByObservedAtDesc(Long creditId, State state);

    List<CreditFieldControl> findByCredit_IdInAndObservedAtBetweenAndState(
            List<Long> creditIds,
            LocalDateTime start,
            LocalDateTime end,
            State state
    );

    boolean existsByReference(String reference);

    Optional<CreditFieldControl> findByReference(String reference);

    @Query("""
            SELECT c FROM CreditFieldControl c
            JOIN FETCH c.credit cr
            LEFT JOIN FETCH cr.client
            WHERE c.state = com.optimize.common.entities.enums.State.ENABLED
              AND c.status = com.optimize.elykia.core.enumaration.FieldControlStatus.ECART
              AND c.observedAt = (
                SELECT MAX(c2.observedAt) FROM CreditFieldControl c2
                WHERE c2.credit.id = c.credit.id
                  AND c2.state = com.optimize.common.entities.enums.State.ENABLED
              )
              AND LOWER(cr.collector) = LOWER(COALESCE(:commercial, cr.collector))
            """)
    List<CreditFieldControl> findLatestEcarts(@Param("commercial") String commercial);

    @Query(value = """
            SELECT COALESCE(SUM(c.notebook_total_amount), 0)
            FROM credit_field_control c
            JOIN credit cr ON cr.id = c.credit_id
            WHERE c.visibility = 'ENABLED'
              AND LOWER(cr.collector) = LOWER(:commercial)
              AND c.id = (
                SELECT c2.id FROM credit_field_control c2
                WHERE c2.credit_id = c.credit_id AND c2.visibility = 'ENABLED'
                ORDER BY c2.observed_at DESC, c2.id DESC
                LIMIT 1
              )
            """, nativeQuery = true)
    Double sumLatestNotebookForCollector(@Param("commercial") String commercial);

    @Query(value = """
            SELECT COALESCE(SUM(c.difference_amount), 0)
            FROM credit_field_control c
            JOIN credit cr ON cr.id = c.credit_id
            WHERE c.visibility = 'ENABLED'
              AND c.difference_amount > 0.5
              AND LOWER(cr.collector) = LOWER(:commercial)
              AND c.id = (
                SELECT c2.id FROM credit_field_control c2
                WHERE c2.credit_id = c.credit_id AND c2.visibility = 'ENABLED'
                ORDER BY c2.observed_at DESC, c2.id DESC
                LIMIT 1
              )
              AND NOT EXISTS (
                SELECT 1 FROM carnet_ecart_decision d
                WHERE d.credit_field_control_id = c.id
                  AND d.visibility = 'ENABLED'
                  AND d.status IN ('ACCEPTED', 'REJECTED')
              )
            """, nativeQuery = true)
    Double sumPendingPositiveDifferenceForCollector(@Param("commercial") String commercial);
}
