package com.optimize.elykia.reporting.infrastructure.persistence;

import com.optimize.elykia.reporting.web.dto.FormerCreditTimelineDto;
import com.optimize.elykia.sale.domain.CreditTimeline;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * Read-only former-portfolio projection queries over {@link CreditTimeline} kept in {@code core}
 * so {@code sale.infrastructure.persistence.CreditTimelineRepository} has zero dependency on {@code core.dto.portfolio}.
 */
public interface FormerPortfolioTimelineQueryRepository extends Repository<CreditTimeline, Long> {

    @Query("""
            SELECT new com.optimize.elykia.reporting.web.dto.FormerCreditTimelineDto(
                ct.credit.id, ct.id, ct.amount, ct.createdDate, ct.reference)
            FROM CreditTimeline ct
            WHERE ct.credit.id = :creditId
              AND ct.state = com.optimize.common.entities.enums.State.ENABLED
              AND LOWER(ct.collector) = LOWER(:commercial)
            ORDER BY ct.createdDate DESC, ct.id DESC
            """)
    List<FormerCreditTimelineDto> findOwnByCredit(
            @Param("creditId") Long creditId,
            @Param("commercial") String commercial);

    @Query("""
            SELECT new com.optimize.elykia.reporting.web.dto.FormerCreditTimelineDto(
                ct.credit.id, ct.id, ct.amount, ct.createdDate, ct.reference)
            FROM CreditTimeline ct
            WHERE ct.credit.id IN :creditIds
              AND ct.state = com.optimize.common.entities.enums.State.ENABLED
              AND LOWER(ct.collector) = LOWER(:commercial)
            ORDER BY ct.createdDate DESC, ct.id DESC
            """)
    List<FormerCreditTimelineDto> findOwnByCreditIds(
            @Param("creditIds") Collection<Long> creditIds,
            @Param("commercial") String commercial);
}
