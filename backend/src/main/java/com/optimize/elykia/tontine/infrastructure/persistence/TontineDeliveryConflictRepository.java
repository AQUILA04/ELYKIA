package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.tontine.domain.TontineDeliveryConflict;
import com.optimize.elykia.tontine.domain.TontineDeliveryConflictOperation;
import com.optimize.elykia.tontine.domain.TontineDeliveryConflictOutcome;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface TontineDeliveryConflictRepository extends JpaRepository<TontineDeliveryConflict, Long> {

    Optional<TontineDeliveryConflict> findFirstByTontineMemberIdAndOperationAndIncomingReferenceOrderByIdDesc(
            Long tontineMemberId, TontineDeliveryConflictOperation operation, String incomingReference);

    Optional<TontineDeliveryConflict> findFirstByIncomingAuthenticityCodeAndOutcomeOrderByIdDesc(
            String incomingAuthenticityCode, TontineDeliveryConflictOutcome outcome);

    boolean existsByTontineMemberIdAndIncomingReferenceAndOutcome(
            Long tontineMemberId, String incomingReference, TontineDeliveryConflictOutcome outcome);

    /** Les bornes de date sont toujours renseignées par le service (Postgres ne type pas un null JPQL). */
    @Query("""
            SELECT c FROM TontineDeliveryConflict c
            WHERE c.lastSeenAt >= :dateFrom
              AND c.lastSeenAt <= :dateTo
              AND (:commercial IS NULL OR c.commercialUsername = :commercial)
              AND (:outcome IS NULL OR c.outcome = :outcome)
            ORDER BY c.lastSeenAt DESC
            """)
    Page<TontineDeliveryConflict> search(@Param("dateFrom") LocalDateTime dateFrom,
                                         @Param("dateTo") LocalDateTime dateTo,
                                         @Param("commercial") String commercial,
                                         @Param("outcome") TontineDeliveryConflictOutcome outcome,
                                         Pageable pageable);
}
