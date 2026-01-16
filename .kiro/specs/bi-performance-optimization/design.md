# Design Document - BI Performance Optimization

## Overview

This design addresses the OutOfMemoryException issue in the BI Dashboard by replacing in-memory Stream processing with database-level aggregations. The solution involves creating aggregation tables, optimizing SQL queries, and maintaining API compatibility while drastically improving performance.

### Current Problem

The existing implementation loads all Credit entities into memory and uses Java Streams for calculations:
- `List<Credit> credits = creditRepository.findByAccountingDateBetween(...)` loads thousands of records
- Multiple stream operations iterate over the same data
- Annual queries can load 10,000+ credits causing OutOfMemoryException

### Solution Approach

1. **Database Aggregation**: Move calculations from Java to PostgreSQL using GROUP BY, SUM, COUNT
2. **Aggregation Tables**: Pre-calculate daily/monthly metrics for fast retrieval
3. **Native Queries**: Use @Query with native SQL for optimized data access
4. **Incremental Updates**: Update aggregations in real-time or via scheduled jobs
5. **Backward Compatibility**: Keep existing API contracts unchanged

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend / API Clients                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ (Same API)
┌─────────────────────────────────────────────────────────────┐
│                    REST Controllers                          │
│              (No changes - same endpoints)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BI Services (OPTIMIZED)                   │
│  - BiDashboardService                                        │
│  - BiSalesAnalyticsService                                   │
│  - BiCollectionAnalyticsService                              │
│  - BiStockAnalyticsService                                   │
│  (Use native queries instead of Streams)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Repositories (NEW METHODS)                      │
│  - CreditRepository (native query methods)                   │
│  - SalesAggregationRepository (new)                          │
│  - CollectionAggregationRepository (new)                     │
│  - CommercialPerformanceRepository (new)                     │
└─────────────────────────────────────────────────────────────┐
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  - credit (existing)                                         │
│  - credit_articles (existing)                                │
│  - sales_analytics_daily (NEW)                               │
│  - collection_analytics_daily (NEW)                          │
│  - commercial_performance_monthly (NEW)                      │
│  - portfolio_snapshot (NEW)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Comparison

**BEFORE (Current - Causes OutOfMemory):**
```
1. Load ALL credits → List<Credit> (10,000+ objects in memory)
2. Stream operations → Multiple iterations
3. Calculate in Java → CPU intensive
4. Return DTO
```

**AFTER (Optimized):**
```
1. Execute SQL aggregation → Database does the work
2. Return aggregated results → Small result set
3. Map to DTO → Minimal memory usage
4. Return DTO
```

## Components and Interfaces

### 1. New Aggregation Tables

#### 1.1 sales_analytics_daily

Stores daily sales aggregations to avoid recalculating on every request.

**Schema:**

```sql
CREATE TABLE sales_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    sale_date DATE NOT NULL,
    collector VARCHAR(255),
    client_type VARCHAR(50),
    sales_count INTEGER NOT NULL DEFAULT 0,
    total_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_profit DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_sale_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_collected DOUBLE PRECISION NOT NULL DEFAULT 0,
    settled_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sale_date, collector, client_type)
);

CREATE INDEX idx_sales_analytics_date ON sales_analytics_daily(sale_date);
CREATE INDEX idx_sales_analytics_collector ON sales_analytics_daily(collector);
CREATE INDEX idx_sales_analytics_date_range ON sales_analytics_daily(sale_date, collector);
```

**Purpose:** Pre-calculate daily sales metrics per commercial and client type.

**Updated by:** 
- Real-time: When credit is created/updated
- Batch: Daily scheduler at 2 AM

#### 1.2 collection_analytics_daily

Stores daily collection aggregations.

**Schema:**
```sql
CREATE TABLE collection_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    collection_date DATE NOT NULL,
    collector VARCHAR(255),
    payment_count INTEGER NOT NULL DEFAULT 0,
    total_collected DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_payment DOUBLE PRECISION NOT NULL DEFAULT 0,
    on_time_count INTEGER NOT NULL DEFAULT 0,
    late_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_date, collector)
);

CREATE INDEX idx_collection_analytics_date ON collection_analytics_daily(collection_date);
CREATE INDEX idx_collection_analytics_collector ON collection_analytics_daily(collector);
```

**Purpose:** Pre-calculate daily collection metrics per commercial.

**Updated by:**
- Real-time: When payment is recorded
- Batch: Daily scheduler at 2 AM

#### 1.3 commercial_performance_monthly

Stores monthly performance metrics per commercial.

**Schema:**
```sql
CREATE TABLE commercial_performance_monthly (
    id BIGSERIAL PRIMARY KEY,
    collector VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_sales_count INTEGER NOT NULL DEFAULT 0,
    total_sales_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_profit DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_sale_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_collected DOUBLE PRECISION NOT NULL DEFAULT 0,
    collection_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    active_clients_count INTEGER NOT NULL DEFAULT 0,
    new_clients_count INTEGER NOT NULL DEFAULT 0,
    late_credits_count INTEGER NOT NULL DEFAULT 0,
    portfolio_at_risk DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collector, year, month)
);

CREATE INDEX idx_commercial_perf_collector ON commercial_performance_monthly(collector);
CREATE INDEX idx_commercial_perf_period ON commercial_performance_monthly(year, month);
```

**Purpose:** Pre-calculate monthly commercial performance for rankings.

**Updated by:**
- Batch: Monthly scheduler on 1st at 2 AM
- On-demand: When generating monthly reports

#### 1.4 portfolio_snapshot

Stores portfolio state snapshots for historical tracking.

**Schema:**
```sql
CREATE TABLE portfolio_snapshot (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    active_credits_count INTEGER NOT NULL DEFAULT 0,
    total_outstanding DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_overdue DOUBLE PRECISION NOT NULL DEFAULT 0,
    par_7 DOUBLE PRECISION NOT NULL DEFAULT 0,
    par_15 DOUBLE PRECISION NOT NULL DEFAULT 0,
    par_30 DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_credit_duration DOUBLE PRECISION,
    early_payers_count INTEGER NOT NULL DEFAULT 0,
    on_time_payers_count INTEGER NOT NULL DEFAULT 0,
    late_payers_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_snapshot_date ON portfolio_snapshot(snapshot_date);
```

**Purpose:** Track portfolio evolution over time.

**Updated by:**
- Batch: Daily scheduler at 2 AM

### 2. Optimized Repository Methods

#### 2.1 CreditRepository - New Native Query Methods

```java
public interface CreditRepository extends JpaRepository<Credit, Long> {
    
    // Existing methods remain unchanged
    
    // NEW: Aggregate sales metrics by date range
    @Query(value = """
        SELECT 
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.accounting_date BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    SalesMetricsProjection getSalesMetrics(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    // NEW: Aggregate sales by date (for trends)
    @Query(value = """
        SELECT 
            c.accounting_date as date,
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.accounting_date BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY c.accounting_date
        ORDER BY c.accounting_date
        """, nativeQuery = true)
    List<SalesTrendProjection> getSalesTrends(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    // NEW: Aggregate by commercial
    @Query(value = """
        SELECT 
            c.collector,
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount,
            COALESCE(SUM(c.total_amount_paid), 0) as totalCollected
        FROM credit c
        WHERE c.accounting_date BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY c.collector
        ORDER BY totalAmount DESC
        """, nativeQuery = true)
    List<CommercialSalesProjection> getSalesByCommercial(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    
    // NEW: Portfolio metrics with single query
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
    
    // NEW: Overdue analysis by ranges
    @Query(value = """
        SELECT 
            CASE 
                WHEN EXTRACT(DAY FROM (CURRENT_DATE - c.expected_end_date)) BETWEEN 0 AND 7 THEN '0-7 jours'
                WHEN EXTRACT(DAY FROM (CURRENT_DATE - c.expected_end_date)) BETWEEN 8 AND 15 THEN '8-15 jours'
                WHEN EXTRACT(DAY FROM (CURRENT_DATE - c.expected_end_date)) BETWEEN 16 AND 30 THEN '16-30 jours'
                ELSE '>30 jours'
            END as range,
            COUNT(c.id) as creditsCount,
            COALESCE(SUM(c.total_amount_remaining), 0) as totalAmount
        FROM credit c
        WHERE c.status = 'INPROGRESS'
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        AND c.expected_end_date < CURRENT_DATE
        GROUP BY range
        ORDER BY 
            CASE range
                WHEN '0-7 jours' THEN 1
                WHEN '8-15 jours' THEN 2
                WHEN '16-30 jours' THEN 3
                ELSE 4
            END
        """, nativeQuery = true)
    List<OverdueRangeProjection> getOverdueAnalysis();
    
    // NEW: Article performance aggregation
    @Query(value = """
        SELECT 
            a.id as articleId,
            a.commercial_name as articleName,
            a.category,
            COALESCE(SUM(ca.quantity), 0) as quantitySold,
            COALESCE(SUM(ca.quantity * ca.unit_price), 0) as totalRevenue,
            COALESCE(SUM(ca.quantity * (ca.unit_price - a.purchase_price)), 0) as totalProfit,
            a.stock_turnover_rate as turnoverRate,
            a.stock_quantity as stockQuantity
        FROM articles a
        LEFT JOIN credit_articles ca ON ca.articles_id = a.id
        LEFT JOIN credit c ON ca.credit_id = c.id
        WHERE c.accounting_date BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY a.id, a.commercial_name, a.category, a.stock_turnover_rate, a.stock_quantity
        HAVING SUM(ca.quantity) > 0
        ORDER BY totalRevenue DESC
        """, nativeQuery = true)
    List<ArticlePerformanceProjection> getArticlePerformance(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
```

#### 2.2 Projection Interfaces

```java
// Projection for sales metrics
public interface SalesMetricsProjection {
    Integer getSalesCount();
    Double getTotalAmount();
    Double getTotalProfit();
    Double getAvgAmount();
}

// Projection for sales trends
public interface SalesTrendProjection {
    LocalDate getDate();
    Integer getSalesCount();
    Double getTotalAmount();
    Double getTotalProfit();
    Double getAvgAmount();
}

// Projection for commercial sales
public interface CommercialSalesProjection {
    String getCollector();
    Integer getSalesCount();
    Double getTotalAmount();
    Double getTotalProfit();
    Double getAvgAmount();
    Double getTotalCollected();
}

// Projection for portfolio metrics
public interface PortfolioMetricsProjection {
    Integer getActiveCount();
    Double getTotalOutstanding();
    Double getTotalOverdue();
    Double getPar7();
    Double getPar15();
    Double getPar30();
}

// Projection for overdue ranges
public interface OverdueRangeProjection {
    String getRange();
    Integer getCreditsCount();
    Double getTotalAmount();
}

// Projection for article performance
public interface ArticlePerformanceProjection {
    Long getArticleId();
    String getArticleName();
    String getCategory();
    Integer getQuantitySold();
    Double getTotalRevenue();
    Double getTotalProfit();
    Double getTurnoverRate();
    Integer getStockQuantity();
}
```

### 3. New Repository Interfaces

#### 3.1 SalesAggregationRepository

```java
@Repository
public interface SalesAggregationRepository extends JpaRepository<SalesAnalyticsDaily, Long> {
    
    @Query(value = """
        SELECT 
            sale_date as date,
            SUM(sales_count) as salesCount,
            SUM(total_sales) as totalAmount,
            SUM(total_profit) as totalProfit,
            AVG(avg_sale_amount) as avgAmount
        FROM sales_analytics_daily
        WHERE sale_date BETWEEN :startDate AND :endDate
        GROUP BY sale_date
        ORDER BY sale_date
        """, nativeQuery = true)
    List<SalesTrendProjection> findTrendsByDateRange(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    @Query(value = """
        SELECT 
            collector,
            SUM(sales_count) as salesCount,
            SUM(total_sales) as totalAmount,
            SUM(total_profit) as totalProfit,
            AVG(avg_sale_amount) as avgAmount,
            SUM(total_collected) as totalCollected
        FROM sales_analytics_daily
        WHERE sale_date BETWEEN :startDate AND :endDate
        GROUP BY collector
        ORDER BY totalAmount DESC
        """, nativeQuery = true)
    List<CommercialSalesProjection> findByCommercial(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    Optional<SalesAnalyticsDaily> findBySaleDateAndCollectorAndClientType(
        LocalDate saleDate, String collector, String clientType
    );
}
```

#### 3.2 CommercialPerformanceRepository

```java
@Repository
public interface CommercialPerformanceRepository extends JpaRepository<CommercialPerformanceMonthly, Long> {
    
    List<CommercialPerformanceMonthly> findByYearAndMonth(Integer year, Integer month);
    
    List<CommercialPerformanceMonthly> findByCollectorAndYearAndMonthBetween(
        String collector, Integer year, Integer startMonth, Integer endMonth
    );
    
    Optional<CommercialPerformanceMonthly> findByCollectorAndYearAndMonth(
        String collector, Integer year, Integer month
    );
}
```

## Data Models

### Entity: SalesAnalyticsDaily

```java
@Entity
@Table(name = "sales_analytics_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"sale_date", "collector", "client_type"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalesAnalyticsDaily {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "client_type", length = 50)
    private String clientType;
    
    @Column(name = "sales_count", nullable = false)
    private Integer salesCount = 0;
    
    @Column(name = "total_sales", nullable = false)
    private Double totalSales = 0.0;
    
    @Column(name = "total_cost", nullable = false)
    private Double totalCost = 0.0;
    
    @Column(name = "total_profit", nullable = false)
    private Double totalProfit = 0.0;
    
    @Column(name = "avg_sale_amount", nullable = false)
    private Double avgSaleAmount = 0.0;
    
    @Column(name = "total_collected", nullable = false)
    private Double totalCollected = 0.0;
    
    @Column(name = "settled_count", nullable = false)
    private Integer settledCount = 0;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### Entity: CollectionAnalyticsDaily

```java
@Entity
@Table(name = "collection_analytics_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"collection_date", "collector"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionAnalyticsDaily {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "collection_date", nullable = false)
    private LocalDate collectionDate;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "payment_count", nullable = false)
    private Integer paymentCount = 0;
    
    @Column(name = "total_collected", nullable = false)
    private Double totalCollected = 0.0;
    
    @Column(name = "avg_payment", nullable = false)
    private Double avgPayment = 0.0;
    
    @Column(name = "on_time_count", nullable = false)
    private Integer onTimeCount = 0;
    
    @Column(name = "late_count", nullable = false)
    private Integer lateCount = 0;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### Entity: CommercialPerformanceMonthly

```java
@Entity
@Table(name = "commercial_performance_monthly",
       uniqueConstraints = @UniqueConstraint(columnNames = {"collector", "year", "month"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommercialPerformanceMonthly {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "collector", nullable = false)
    private String collector;
    
    @Column(name = "year", nullable = false)
    private Integer year;
    
    @Column(name = "month", nullable = false)
    private Integer month;
    
    @Column(name = "total_sales_count", nullable = false)
    private Integer totalSalesCount = 0;
    
    @Column(name = "total_sales_amount", nullable = false)
    private Double totalSalesAmount = 0.0;
    
    @Column(name = "total_profit", nullable = false)
    private Double totalProfit = 0.0;
    
    @Column(name = "avg_sale_amount", nullable = false)
    private Double avgSaleAmount = 0.0;
    
    @Column(name = "total_collected", nullable = false)
    private Double totalCollected = 0.0;
    
    @Column(name = "collection_rate", nullable = false)
    private Double collectionRate = 0.0;
    
    @Column(name = "active_clients_count", nullable = false)
    private Integer activeClientsCount = 0;
    
    @Column(name = "new_clients_count", nullable = false)
    private Integer newClientsCount = 0;
    
    @Column(name = "late_credits_count", nullable = false)
    private Integer lateCreditsCount = 0;
    
    @Column(name = "portfolio_at_risk", nullable = false)
    private Double portfolioAtRisk = 0.0;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### Entity: PortfolioSnapshot

```java
@Entity
@Table(name = "portfolio_snapshot")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioSnapshot {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "snapshot_date", nullable = false, unique = true)
    private LocalDate snapshotDate;
    
    @Column(name = "active_credits_count", nullable = false)
    private Integer activeCreditsCount = 0;
    
    @Column(name = "total_outstanding", nullable = false)
    private Double totalOutstanding = 0.0;
    
    @Column(name = "total_overdue", nullable = false)
    private Double totalOverdue = 0.0;
    
    @Column(name = "par_7", nullable = false)
    private Double par7 = 0.0;
    
    @Column(name = "par_15", nullable = false)
    private Double par15 = 0.0;
    
    @Column(name = "par_30", nullable = false)
    private Double par30 = 0.0;
    
    @Column(name = "avg_credit_duration")
    private Double avgCreditDuration;
    
    @Column(name = "early_payers_count", nullable = false)
    private Integer earlyPayersCount = 0;
    
    @Column(name = "on_time_payers_count", nullable = false)
    private Integer onTimePayersCount = 0;
    
    @Column(name = "late_payers_count", nullable = false)
    private Integer latePayersCount = 0;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, several properties can be combined or are redundant:

**Redundancies identified:**
- Properties about "using SQL instead of Streams" (1.1, 1.4, 4.1, 4.2, 5.1, 6.1, 6.2, 6.3) are implementation details that cannot be directly tested. Instead, we focus on correctness and performance.
- Multiple performance properties (1.3, 4.4, 5.4, 6.4) can be consolidated into a single comprehensive performance property.
- API compatibility properties (8.1, 8.2, 8.3, 8.4) can be combined into one property about maintaining API contracts.
- Schema verification examples (2.1-2.6, 7.1-7.5) are one-time checks, not properties.

**Consolidated properties:**
1. SQL aggregation correctness (combines 1.1, 4.3, 5.2)
2. Performance bounds (combines 1.3, 4.4, 5.4, 6.4)
3. Real-time aggregation updates (combines 3.1, 3.2)
4. API backward compatibility (combines 8.1, 8.2, 8.3, 8.4)
5. Migration idempotency (9.4)
6. Error handling and logging (3.5, 10.2)

### Properties

**Property 1: SQL Aggregation Correctness**

*For any* date range and any set of credits in the database, the aggregated sales metrics calculated via SQL queries should match the sum of individual credit values.

**Validates: Requirements 1.1, 4.3, 5.2**

**Property 2: Performance Bounds**

*For any* BI query (sales trends, portfolio metrics, overdue analysis, article performance), the execution time should be less than 2 seconds for annual data and less than 500ms for monthly data.

**Validates: Requirements 1.3, 4.4, 5.4, 6.4**

**Property 3: Real-time Aggregation Updates**

*For any* new credit created or payment recorded, the corresponding aggregation tables (sales_analytics_daily or collection_analytics_daily) should be updated to reflect the new data within the same transaction.

**Validates: Requirements 3.1, 3.2**

**Property 4: API Backward Compatibility**

*For any* existing BI endpoint, the optimized implementation should return the same DTO structure and HTTP status codes as the original implementation for equivalent inputs.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

**Property 5: Migration Idempotency**

*For any* aggregation table, running the historical data migration script multiple times should produce the same final state without duplicating records.

**Validates: Requirements 9.4**

**Property 6: Error Handling Without System Failure**

*For any* scheduler task or aggregation update that encounters an error, the system should log the error and continue operating without throwing unhandled exceptions.

**Validates: Requirements 3.5, 10.2**

**Property 7: Overdue Range Completeness**

*For any* set of overdue credits, the overdue analysis should return exactly 4 ranges (0-7 days, 8-15 days, 16-30 days, >30 days) with each credit counted in exactly one range.

**Validates: Requirements 5.2**

**Property 8: Portfolio Metrics Consistency**

*For any* point in time, the sum of PAR 7, PAR 15, and PAR 30 should be calculated in a single query and PAR 30 should be greater than or equal to PAR 15, which should be greater than or equal to PAR 7.

**Validates: Requirements 4.3**

## Error Handling

### Database Errors

**Connection Failures:**
- Retry logic with exponential backoff
- Fallback to cached data if available
- Return HTTP 503 Service Unavailable with retry-after header

**Query Timeouts:**
- Set query timeout to 30 seconds
- Log slow queries for optimization
- Return HTTP 504 Gateway Timeout

**Constraint Violations:**
- Handle unique constraint violations gracefully (upsert logic)
- Log violations for debugging
- Return HTTP 409 Conflict if user-facing

### Aggregation Errors

**Scheduler Failures:**
- Log error with full stack trace
- Send alert to monitoring system
- Continue with next scheduled execution
- Do not crash the application

**Data Inconsistency:**
- Detect via checksum or count validation
- Trigger automatic re-aggregation
- Log warning for manual review

**Missing Data:**
- Handle null values with COALESCE in SQL
- Return zero values instead of null in DTOs
- Log warning if unexpected nulls found

### API Errors

**Invalid Date Ranges:**
- Validate startDate <= endDate
- Return HTTP 400 Bad Request with clear message
- Suggest valid date format

**Missing Parameters:**
- Use sensible defaults (current month, all commercials)
- Document default behavior in API docs

**Authorization Errors:**
- Return HTTP 403 Forbidden for insufficient roles
- Log unauthorized access attempts

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure correctness and performance:

**Unit Tests:**
- Verify specific SQL queries return expected results for known data
- Test edge cases (empty results, single record, boundary dates)
- Test error handling (null values, invalid dates, database errors)
- Test scheduler configuration and execution
- Test migration scripts on test database

**Property-Based Tests:**
- Generate random date ranges and verify aggregation correctness
- Generate random credits and verify real-time updates
- Test API compatibility with random valid inputs
- Test migration idempotency with random data sets
- Test performance bounds with varying data sizes

### Property Test Configuration

- **Framework:** JUnit 5 + jqwik (Java property-based testing library)
- **Iterations:** Minimum 100 iterations per property test
- **Test Data:** Use jqwik generators for dates, amounts, credits
- **Performance Tests:** Use @Timeout annotation with appropriate limits

### Test Tagging

Each property-based test must include a comment referencing the design property:

```java
/**
 * Feature: bi-performance-optimization, Property 1: SQL Aggregation Correctness
 * Validates: Requirements 1.1, 4.3, 5.2
 */
@Property
void sqlAggregationMatchesIndividualSums(@ForAll("dateRanges") DateRange range) {
    // Test implementation
}
```

### Integration Tests

- Test full API endpoints with real database
- Verify Flyway migrations execute successfully
- Test scheduler execution (manually triggered)
- Verify indexes are created and used (EXPLAIN ANALYZE)
- Load test with production-like data volumes

### Performance Tests

- Benchmark queries with 1 year of data (10,000+ credits)
- Measure memory usage (should not exceed 512MB heap)
- Verify no OutOfMemoryException with annual queries
- Compare before/after optimization metrics

## Implementation Notes

### Migration Strategy

**Phase 1: Create Tables**
- Run Flyway migration to create aggregation tables
- Create indexes
- No data yet

**Phase 2: Populate Historical Data**
- Run batch job to populate aggregation tables from existing credits
- Can be done during low-traffic period
- Monitor progress via logs

**Phase 3: Deploy Optimized Services**
- Deploy new service implementations
- Services read from aggregation tables
- Real-time updates start working

**Phase 4: Enable Schedulers**
- Activate daily/monthly schedulers
- Monitor for errors
- Verify aggregations stay up-to-date

### Rollback Plan

If issues arise:
1. Revert service code to previous version (still works with old queries)
2. Aggregation tables remain but unused
3. Can retry optimization after fixing issues
4. No data loss

### Performance Monitoring

**Metrics to Track:**
- Query execution time (p50, p95, p99)
- Memory usage of BI services
- Database CPU usage
- Aggregation table sizes
- Scheduler execution time

**Alerts:**
- Query time > 2 seconds
- Memory usage > 80%
- Scheduler failures
- Data inconsistencies detected

### Database Optimization

**Indexes:**
- All date columns used in WHERE clauses
- All columns used in GROUP BY
- Composite indexes for common query patterns

**Partitioning (Future):**
- Consider partitioning aggregation tables by date
- Improves query performance for recent data
- Easier to archive old data

**Vacuum and Analyze:**
- Run VACUUM ANALYZE after bulk inserts
- Schedule regular maintenance
- Monitor table bloat

