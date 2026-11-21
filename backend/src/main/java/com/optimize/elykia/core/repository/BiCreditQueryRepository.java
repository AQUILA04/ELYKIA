package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.dto.bi.ArticlePerformanceProjection;
import com.optimize.elykia.core.dto.bi.CommercialSalesProjection;
import com.optimize.elykia.core.dto.bi.OverdueRangeProjection;
import com.optimize.elykia.core.dto.bi.PortfolioMetricsProjection;
import com.optimize.elykia.core.dto.bi.SalesMetricsProjection;
import com.optimize.elykia.core.dto.bi.SalesTrendProjection;
import com.optimize.elykia.sale.domain.Credit;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

/**
 * Read-only BI projection queries over {@link Credit} kept in {@code core} (until Wave 7 {@code bi})
 * so {@code sale.infrastructure.persistence.CreditRepository} has zero dependency on {@code core.dto.bi}.
 */
public interface BiCreditQueryRepository extends Repository<Credit, Long> {

    @Query(value = """
        SELECT
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.date_reg BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    SalesMetricsProjection getSalesMetrics(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query(value = """
        SELECT
            c.date_reg as date,
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.accounting_date BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY c.date_reg
        ORDER BY c.date_reg
        """, nativeQuery = true)
    List<SalesTrendProjection> getSalesTrends(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query(value = """
        SELECT
            c.collector,
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount,
            COALESCE(SUM(c.total_amount_paid), 0) as totalCollected
        FROM credit c
        WHERE c.date_reg BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY c.collector
        ORDER BY totalAmount DESC
        """, nativeQuery = true)
    List<CommercialSalesProjection> getSalesByCommercial(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query(value = """
        SELECT
            COUNT(CASE WHEN c.status = 'INPROGRESS' THEN 1 END) as activeCount,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' THEN c.total_amount_remaining ELSE 0 END), 0) as totalOutstanding,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE THEN c.total_amount_remaining ELSE 0 END), 0) as totalOverdue,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE - INTERVAL '7 days' THEN c.total_amount_remaining ELSE 0 END), 0) as par7,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE - INTERVAL '15 days' THEN c.total_amount_remaining ELSE 0 END), 0) as par15,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE - INTERVAL '30 days' THEN c.total_amount_remaining ELSE 0 END), 0) as par30
        FROM credit c
        WHERE c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    PortfolioMetricsProjection getPortfolioMetrics();

    @Query(value = """
        SELECT
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.accounting_date = :date
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    SalesMetricsProjection getDailySalesMetricsForAccountingDate(@Param("date") LocalDate date);

    @Query(value = """
        SELECT
            COUNT(CASE WHEN c.status = 'INPROGRESS' THEN 1 END) as activeCount,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' THEN c.total_amount_remaining ELSE 0 END), 0) as totalOutstanding,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < :asOfDate THEN c.total_amount_remaining ELSE 0 END), 0) as totalOverdue,
            0 as par7,
            0 as par15,
            0 as par30
        FROM credit c
        WHERE c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    PortfolioMetricsProjection getPortfolioMetricsAsOf(@Param("asOfDate") LocalDate asOfDate);

    @Query(value = """
        SELECT
            CASE
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 0 AND 7 THEN '0-7 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 8 AND 15 THEN '8-15 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 16 AND 30 THEN '16-30 jours'
                ELSE '>30 jours'
            END as range,
            COUNT(c.id) as creditsCount,
            COALESCE(SUM(c.total_amount_remaining), 0) as totalAmount
        FROM credit c
        WHERE c.status = 'INPROGRESS'
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        AND c.expected_end_date < CURRENT_DATE
        GROUP BY
            CASE
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 0 AND 7 THEN '0-7 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 8 AND 15 THEN '8-15 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 16 AND 30 THEN '16-30 jours'
                ELSE '>30 jours'
            END
        ORDER BY
            MIN(CURRENT_DATE - c.expected_end_date)
        """, nativeQuery = true)
    List<OverdueRangeProjection> getOverdueAnalysis();

    @Query(value = """
        SELECT
            a.id as articleId,
            CONCAT(a.type, ': ', a.marque, ' ', a.model) as articleName,
            a.category,
            COALESCE(SUM(ca.quantity), 0) as quantitySold,
            COALESCE(SUM(ca.quantity * ca.unit_price), 0) as totalRevenue,
            COALESCE(SUM(ca.quantity * (ca.unit_price - a.purchase_price)), 0) as totalProfit,
            a.stock_turnover_rate as turnoverRate,
            a.stock_quantity as stockQuantity
        FROM articles a
        LEFT JOIN credit_articles ca ON ca.articles_id = a.id
        LEFT JOIN credit c ON ca.credit_id = c.id
        WHERE c.date_reg BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY a.id, a.type, a.marque, a.model, a.category, a.stock_turnover_rate, a.stock_quantity
        HAVING SUM(ca.quantity) > 0
        ORDER BY totalRevenue DESC
        """, nativeQuery = true)
    List<ArticlePerformanceProjection> getArticlePerformance(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
