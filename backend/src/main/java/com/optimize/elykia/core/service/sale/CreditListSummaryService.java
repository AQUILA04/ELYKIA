package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.enumaration.OperationType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CreditListSummaryService {

    private static final String MARGIN_EXPR =
            "COALESCE(c.profit_margin, c.total_amount - c.total_purchase, 0)";
    private static final String CLOSURE_DATE_EXPR =
            "COALESCE(c.effective_end_date, c.accounting_date, c.begin_date)";

    private final EntityManager entityManager;

    public CreditListSummaryDto summarize(LocalDate startDate, LocalDate endDate, CreditSearchDto search) {
        CreditSearchDto effectiveSearch = search != null ? search : emptySearch();

        SalesTypeSummaryDto closedCredit = aggregateClosed(startDate, endDate, effectiveSearch, OperationType.CREDIT);
        SalesTypeSummaryDto closedCash = aggregateClosed(startDate, endDate, effectiveSearch, OperationType.CASH);
        SalesTypeSummaryDto closedTontine = aggregateClosed(startDate, endDate, effectiveSearch, OperationType.TONTINE);
        SalesTypeSummaryDto closedTotal = new SalesTypeSummaryDto(
                closedCredit.count() + closedCash.count() + closedTontine.count(),
                closedCredit.totalAmount() + closedCash.totalAmount() + closedTontine.totalAmount(),
                closedCredit.totalMargin() + closedCash.totalMargin() + closedTontine.totalMargin()
        );

        InProgressCreditSummaryDto inProgressCredit = aggregateInProgress(effectiveSearch);
        Object[] collected = aggregateCollected(startDate, endDate, effectiveSearch);

        return new CreditListSummaryDto(
                startDate,
                endDate,
                closedTotal,
                closedCredit,
                closedCash,
                closedTontine,
                inProgressCredit,
                toLong(collected[0]),
                toDouble(collected[1])
        );
    }

    private SalesTypeSummaryDto aggregateClosed(
            LocalDate startDate,
            LocalDate endDate,
            CreditSearchDto search,
            OperationType type) {
        CreditSearchSqlFilter filter = CreditSearchSqlFilter.from(search, "c", true);

        String sql = """
                SELECT
                    COALESCE(COUNT(c.id), 0),
                    COALESCE(SUM(c.total_amount), 0),
                    COALESCE(SUM(%s), 0)
                FROM credit c
                LEFT JOIN client cl ON cl.id = c.client_id
                WHERE c.visibility = 'ENABLED'
                  AND c.status = 'SETTLED'
                  AND %s BETWEEN :startDate AND :endDate
                  AND c.type = :operationType
                %s
                """.formatted(MARGIN_EXPR, CLOSURE_DATE_EXPR, filter.getSqlFragment());

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("startDate", startDate);
        query.setParameter("endDate", endDate);
        query.setParameter("operationType", type.name());
        filter.applyTo(query);

        Object[] row = (Object[]) query.getSingleResult();
        return toSalesTypeSummary(row);
    }

    private InProgressCreditSummaryDto aggregateInProgress(CreditSearchDto search) {
        CreditSearchSqlFilter filter = CreditSearchSqlFilter.from(search, "c", true);

        String sql = """
                SELECT
                    COALESCE(COUNT(c.id), 0),
                    COALESCE(SUM(c.total_amount), 0),
                    COALESCE(SUM(%s), 0),
                    COALESCE(SUM(c.total_amount_remaining), 0)
                FROM credit c
                LEFT JOIN client cl ON cl.id = c.client_id
                WHERE c.visibility = 'ENABLED'
                  AND c.status = 'INPROGRESS'
                  AND c.type = 'CREDIT'
                %s
                """.formatted(MARGIN_EXPR, filter.getSqlFragment());

        Query query = entityManager.createNativeQuery(sql);
        filter.applyTo(query);

        Object[] row = (Object[]) query.getSingleResult();
        return new InProgressCreditSummaryDto(
                toLong(row[0]),
                toDouble(row[1]),
                toDouble(row[2]),
                toDouble(row[3])
        );
    }

    private Object[] aggregateCollected(LocalDate startDate, LocalDate endDate, CreditSearchDto search) {
        CreditSearchSqlFilter filter = CreditSearchSqlFilter.from(search, "c", true);
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        String sql = """
                SELECT
                    COALESCE(COUNT(ct.id), 0),
                    COALESCE(SUM(ct.amount), 0)
                FROM credit_timeline ct
                JOIN credit c ON c.id = ct.credit_id
                LEFT JOIN client cl ON cl.id = c.client_id
                WHERE c.visibility = 'ENABLED'
                  AND ct.date_reg >= :startDateTime
                  AND ct.date_reg <= :endDateTime
                %s
                """.formatted(filter.getSqlFragment());

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("startDateTime", startDateTime);
        query.setParameter("endDateTime", endDateTime);
        filter.applyTo(query);

        return (Object[]) query.getSingleResult();
    }

    private static SalesTypeSummaryDto toSalesTypeSummary(Object[] row) {
        return new SalesTypeSummaryDto(toLong(row[0]), toDouble(row[1]), toDouble(row[2]));
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    private static CreditSearchDto emptySearch() {
        return new CreditSearchDto(null, null, null, null, null, null, null);
    }
}
