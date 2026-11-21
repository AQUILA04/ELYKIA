package com.optimize.elykia.reporting.infrastructure.persistence;

import com.optimize.elykia.reporting.web.dto.FormerAgencySaleDto;
import com.optimize.elykia.reporting.web.dto.FormerCreditSeedDto;
import com.optimize.elykia.sale.domain.Credit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * Read-only former-portfolio projection queries over {@link Credit} kept in {@code core}
 * so {@code sale.infrastructure.persistence.CreditRepository} has zero dependency on {@code core.dto.portfolio}.
 */
public interface FormerPortfolioCreditQueryRepository extends Repository<Credit, Long> {

    @Query(value = """
            SELECT new com.optimize.elykia.reporting.web.dto.FormerCreditSeedDto(
                cr.id, cr.reference, c.id, c.code, c.firstname, c.lastname, c.phone, c.quarter, cr.beginDate)
            FROM Credit cr
            JOIN cr.client c
            WHERE cr.state = com.optimize.common.entities.enums.State.ENABLED
              AND cr.type = com.optimize.elykia.shared.domain.OperationType.CREDIT
              AND (cr.collector IS NULL OR LOWER(cr.collector) <> LOWER(:commercial))
              AND (
                EXISTS (
                    SELECT 1 FROM CreditCollectorHistory h
                    WHERE h.credit = cr
                      AND h.state = com.optimize.common.entities.enums.State.ENABLED
                      AND h.oldCollector IS NOT NULL
                      AND LOWER(h.oldCollector) = LOWER(:commercial)
                )
                OR EXISTS (
                    SELECT 1 FROM CreditTimeline ct
                    WHERE ct.credit = cr
                      AND ct.state = com.optimize.common.entities.enums.State.ENABLED
                      AND ct.collector IS NOT NULL
                      AND LOWER(ct.collector) = LOWER(:commercial)
                )
              )
            ORDER BY cr.beginDate DESC, cr.id DESC
            """,
            countQuery = """
            SELECT COUNT(cr) FROM Credit cr
            JOIN cr.client c
            WHERE cr.state = com.optimize.common.entities.enums.State.ENABLED
              AND cr.type = com.optimize.elykia.shared.domain.OperationType.CREDIT
              AND (cr.collector IS NULL OR LOWER(cr.collector) <> LOWER(:commercial))
              AND (
                EXISTS (
                    SELECT 1 FROM CreditCollectorHistory h
                    WHERE h.credit = cr
                      AND h.state = com.optimize.common.entities.enums.State.ENABLED
                      AND h.oldCollector IS NOT NULL
                      AND LOWER(h.oldCollector) = LOWER(:commercial)
                )
                OR EXISTS (
                    SELECT 1 FROM CreditTimeline ct
                    WHERE ct.credit = cr
                      AND ct.state = com.optimize.common.entities.enums.State.ENABLED
                      AND ct.collector IS NOT NULL
                      AND LOWER(ct.collector) = LOWER(:commercial)
                )
              )
            """)
    Page<FormerCreditSeedDto> findFormerCredits(
            @Param("commercial") String commercial,
            Pageable pageable);

    @Query("""
            SELECT new com.optimize.elykia.reporting.web.dto.FormerAgencySaleDto(
                cr.id, cr.reference, c.id, c.code, c.firstname, c.lastname, c.phone, c.quarter,
                cr.beginDate, cr.totalAmount)
            FROM Credit cr
            JOIN cr.client c
            WHERE cr.state = com.optimize.common.entities.enums.State.ENABLED
              AND cr.type = com.optimize.elykia.shared.domain.OperationType.CASH
              AND c.id IN :clientIds
              AND (
                LOWER(cr.agencyCommercial) = LOWER(:commercial)
                OR LOWER(cr.collector) = LOWER(:commercial)
              )
            ORDER BY cr.beginDate DESC, cr.id DESC
            """)
    List<FormerAgencySaleDto> findFormerAgencySales(
            @Param("clientIds") Collection<Long> clientIds,
            @Param("commercial") String commercial);
}
