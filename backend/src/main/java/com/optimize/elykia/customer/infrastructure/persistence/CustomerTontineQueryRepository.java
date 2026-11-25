package com.optimize.elykia.customer.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.customer.web.dto.CustomerTontineContributionSummaryDto;
import com.optimize.elykia.customer.web.dto.CustomerTontinePaymentDto;
import com.optimize.elykia.tontine.domain.TontineMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Read-only customer-space tontine projections kept in {@code core} (until Wave 7 {@code customer})
 * so {@code tontine} repositories have zero dependency on {@code core.dto.customer}.
 */
public interface CustomerTontineQueryRepository extends Repository<TontineMember, Long> {

    @Query("""
            SELECT new com.optimize.elykia.customer.web.dto.CustomerTontineContributionSummaryDto(
                tm.id,
                tm.tontineSession.year,
                tm.deliveryStatus,
                tm.amount,
                tm.totalContribution,
                tm.societyShare,
                tm.availableContribution,
                tm.validatedMonths,
                tm.currentMonthDays,
                tm.registrationDate,
                tm.tontineSession.startDate,
                tm.tontineSession.endDate,
                tm.tontineSession.status,
                tm.tontineSession.name
            )
            FROM TontineMember tm
            WHERE tm.client.id = :clientId
              AND tm.state = :state
            ORDER BY tm.registrationDate DESC
            """)
    List<CustomerTontineContributionSummaryDto> findCustomerContributionSummariesByClientId(
            @Param("clientId") Long clientId,
            @Param("state") State state);

    @Query("""
            SELECT new com.optimize.elykia.customer.web.dto.CustomerTontinePaymentDto(
                tc.id,
                tc.reference,
                tc.amount,
                tc.collectionDate,
                tc.isDeliveryCollection,
                tc.societyShareAmount,
                CASE WHEN tc.state = com.optimize.common.entities.enums.State.ENABLED THEN 'VALIDE' ELSE 'INITIE' END
            )
            FROM TontineCollection tc
            WHERE tc.tontineMember.id = :memberId
              AND tc.tontineMember.client.id = :clientId
              AND tc.state = :state
            """)
    Page<CustomerTontinePaymentDto> findCustomerPaymentsByMember(
            @Param("memberId") Long memberId,
            @Param("clientId") Long clientId,
            @Param("state") State state,
            Pageable pageable);
}
