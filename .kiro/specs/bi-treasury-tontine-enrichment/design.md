# Design Document - BI Dashboard Enrichment

## Overview

This design enriches the existing BI Dashboard with new analytics modules for treasury management, cash vs credit analysis, Tontine activity, orders tracking, audit analysis, and customer acquisition. The data is already captured in `DailyCommercialReport`, `DailyOperationLog`, and `CashDeposit` tables. The solution involves creating new aggregation tables, implementing new BI services, and exposing new REST endpoints while maintaining the same architectural patterns as the existing BI system.

### Key Design Principles

1. **Reuse Existing Patterns**: Follow the same architecture as bi-performance-optimization
2. **SQL Aggregations**: Use database-level aggregations to avoid memory issues
3. **Incremental Updates**: Support both real-time and batch updates
4. **API Consistency**: Maintain the same Response<T> structure and authentication
5. **Performance First**: All queries must complete in < 2 seconds

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend / API Clients                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    REST Controllers (NEW)                    │
│  - BiTreasuryController                                      │
│  - BiTontineController                                       │
│  - BiOrdersController                                        │
│  - BiAuditController                                         │
│  - BiCustomersController                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BI Services (NEW)                         │
│  - BiTreasuryService                                         │
│  - BiCashCreditAnalyticsService                              │
│  - BiTontineService                                          │
│  - BiOrdersService                                           │
│  - BiAuditService                                            │
│  - BiCustomerAcquisitionService                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Repositories (NEW)                              │
│  - TreasuryAnalyticsRepository                               │
│  - CashCreditAnalyticsRepository                             │
│  - TontineAnalyticsRepository                                │
│  - DailyOperationLogRepository (enriched)                    │
│  - CashDepositRepository (enriched)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  - daily_commercial_report (existing)                        │
│  - daily_operation_log (existing)                            │
│  - cash_deposit (existing)                                   │
│  - treasury_analytics_daily (NEW)                            │
│  - cash_credit_analytics_daily (NEW)                         │
│  - tontine_analytics_monthly (NEW)                           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. New Aggregation Tables

#### 1.1 treasury_analytics_daily

Stores daily treasury metrics per commercial.

**Schema:**
```sql
CREATE TABLE treasury_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    collector VARCHAR(255),
    amount_to_deposit DOUBLE PRECISION NOT NULL DEFAULT 0,
    amount_deposited DOUBLE PRECISION NOT NULL DEFAULT 0,
    amount_remaining DOUBLE PRECISION NOT NULL DEFAULT 0,
    deposit_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    deposits_count INTEGER NOT NULL DEFAULT 0,
    avg_delay_days DOUBLE PRECISION,
    late_deposits_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, collector)
);

CREATE INDEX idx_treasury_date ON treasury_analytics_daily(date);
CREATE INDEX idx_treasury_collector ON treasury_analytics_daily(collector);
CREATE INDEX idx_treasury_date_collector ON treasury_analytics_daily(date, collector);
```

**Purpose:** Pre-calculate daily treasury metrics to avoid loading all CashDeposit records.

**Updated by:**
- Real-time: When CashDeposit is created
- Batch: Daily scheduler at 3 AM

#### 1.2 cash_credit_analytics_daily

Stores daily cash vs credit sales metrics.

**Schema:**
```sql
CREATE TABLE cash_credit_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    collector VARCHAR(255),
    cash_sales_count INTEGER NOT NULL DEFAULT 0,
    cash_sales_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    credit_sales_count INTEGER NOT NULL DEFAULT 0,
    credit_sales_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    cash_ratio DOUBLE PRECISION NOT NULL DEFAULT 0,
    credit_ratio DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_cash_basket DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_credit_basket DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, collector)
);

CREATE INDEX idx_cash_credit_date ON cash_credit_analytics_daily(date);
CREATE INDEX idx_cash_credit_collector ON cash_credit_analytics_daily(collector);
```

**Purpose:** Pre-calculate cash vs credit metrics from DailyOperationLog.

**Updated by:**
- Real-time: When sale is recorded in DailyOperationLog
- Batch: Daily scheduler at 3 AM

#### 1.3 tontine_analytics_monthly

Stores monthly Tontine activity metrics.

**Schema:**
```sql
CREATE TABLE tontine_analytics_monthly (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    collector VARCHAR(255),
    active_adhesions INTEGER NOT NULL DEFAULT 0,
    new_adhesions INTEGER NOT NULL DEFAULT 0,
    collections_count INTEGER NOT NULL DEFAULT 0,
    collections_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    deliveries_count INTEGER NOT NULL DEFAULT 0,
    deliveries_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    collection_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    delivery_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_collection_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    retention_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month, collector)
);

CREATE INDEX idx_tontine_period ON tontine_analytics_monthly(year, month);
CREATE INDEX idx_tontine_collector ON tontine_analytics_monthly(collector);
```

**Purpose:** Pre-calculate monthly Tontine metrics from DailyCommercialReport and DailyOperationLog.

**Updated by:**
- Batch: Monthly scheduler on 1st at 3 AM

### 2. New Repository Interfaces

#### 2.1 TreasuryAnalyticsRepository

```java
@Repository
public interface TreasuryAnalyticsRepository extends JpaRepository<TreasuryAnalyticsDaily, Long> {
    
    @Query(value = """
        SELECT 
            SUM(amount_to_deposit) as totalToDeposit,
            SUM(amount_deposited) as totalDeposited,
            SUM(amount_remaining) as totalRemaining,
            AVG(deposit_rate) as avgDepositRate,
            SUM(deposits_count) as totalDeposits,
            AVG(avg_delay_days) as avgDelayDays,
            SUM(late_deposits_count) as totalLateDeposits
        FROM treasury_analytics_daily
        WHERE date BETWEEN :startDate AND :endDate
        """, nativeQuery = true)
    TreasuryMetricsProjection getTreasuryMetrics(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    @Query(value = """
        SELECT 
            collector,
            SUM(amount_to_deposit) as totalToDeposit,
            SUM(amount_deposited) as totalDeposited,
            SUM(amount_remaining) as totalRemaining,
            AVG(deposit_rate) as depositRate,
            SUM(deposits_count) as depositsCount,
            AVG(avg_delay_days) as avgDelayDays,
            SUM(late_deposits_count) as lateDepositsCount
        FROM treasury_analytics_daily
        WHERE date BETWEEN :startDate AND :endDate
        GROUP BY collector
        ORDER BY totalRemaining DESC
        """, nativeQuery = true)
    List<TreasuryByCommercialProjection> getTreasuryByCommercial(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    @Query(value = """
        SELECT 
            t.collector,
            t.date,
            t.amount_remaining as amountRemaining,
            t.avg_delay_days as delayDays
        FROM treasury_analytics_daily t
        WHERE t.amount_remaining > 0
        AND t.avg_delay_days > 3
        ORDER BY t.avg_delay_days DESC, t.amount_remaining DESC
        """, nativeQuery = true)
    List<LateDepositProjection> getLateDeposits();
    
    Optional<TreasuryAnalyticsDaily> findByDateAndCollector(LocalDate date, String collector);
}
```

#### 2.2 CashCreditAnalyticsRepository

```java
@Repository
public interface CashCreditAnalyticsRepository extends JpaRepository<CashCreditAnalyticsDaily, Long> {
    
    @Query(value = """
        SELECT 
            SUM(cash_sales_count) as cashSalesCount,
            SUM(cash_sales_amount) as cashSalesAmount,
            SUM(credit_sales_count) as creditSalesCount,
            SUM(credit_sales_amount) as creditSalesAmount,
            (SUM(cash_sales_amount) / NULLIF(SUM(cash_sales_amount) + SUM(credit_sales_amount), 0) * 100) as cashRatio,
            AVG(avg_cash_basket) as avgCashBasket,
            AVG(avg_credit_basket) as avgCreditBasket
        FROM cash_credit_analytics_daily
        WHERE date BETWEEN :startDate AND :endDate
        """, nativeQuery = true)
    CashCreditMetricsProjection getCashCreditMetrics(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    @Query(value = """
        SELECT 
            date,
            SUM(cash_sales_amount) as cashAmount,
            SUM(credit_sales_amount) as creditAmount
        FROM cash_credit_analytics_daily
        WHERE date BETWEEN :startDate AND :endDate
        GROUP BY date
        ORDER BY date
        """, nativeQuery = true)
    List<CashCreditTrendProjection> getCashCreditTrends(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    Optional<CashCreditAnalyticsDaily> findByDateAndCollector(LocalDate date, String collector);
}
```

#### 2.3 TontineAnalyticsRepository

```java
@Repository
public interface TontineAnalyticsRepository extends JpaRepository<TontineAnalyticsMonthly, Long> {
    
    @Query(value = """
        SELECT 
            SUM(active_adhesions) as activeAdhesions,
            SUM(new_adhesions) as newAdhesions,
            SUM(collections_count) as collectionsCount,
            SUM(collections_amount) as collectionsAmount,
            SUM(deliveries_count) as deliveriesCount,
            SUM(deliveries_amount) as deliveriesAmount,
            AVG(collection_rate) as collectionRate,
            AVG(delivery_rate) as deliveryRate,
            AVG(avg_collection_amount) as avgCollectionAmount,
            AVG(retention_rate) as retentionRate
        FROM tontine_analytics_monthly
        WHERE year = :year AND month = :month
        """, nativeQuery = true)
    TontineMetricsProjection getTontineMetrics(
        @Param("year") Integer year,
        @Param("month") Integer month
    );
    
    @Query(value = """
        SELECT 
            collector,
            SUM(active_adhesions) as activeAdhesions,
            SUM(collections_count) as collectionsCount,
            SUM(collections_amount) as collectionsAmount,
            AVG(collection_rate) as collectionRate
        FROM tontine_analytics_monthly
        WHERE year = :year AND month = :month
        GROUP BY collector
        ORDER BY collectionsAmount DESC
        """, nativeQuery = true)
    List<TontineByCommercialProjection> getTontineByCommercial(
        @Param("year") Integer year,
        @Param("month") Integer month
    );
    
    Optional<TontineAnalyticsMonthly> findByYearAndMonthAndCollector(
        Integer year, Integer month, String collector
    );
}
```

#### 2.4 DailyOperationLogRepository (Enriched)

```java
@Repository
public interface DailyOperationLogRepository extends JpaRepository<DailyOperationLog, Long> {
    
    // Existing methods...
    
    // NEW: Count operations by type
    @Query(value = """
        SELECT 
            operation_type as operationType,
            COUNT(*) as count
        FROM daily_operation_log
        WHERE operation_date BETWEEN :startDate AND :endDate
        GROUP BY operation_type
        ORDER BY count DESC
        """, nativeQuery = true)
    List<OperationVolumeProjection> getOperationVolume(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // NEW: Activity heatmap (hour of day, day of week)
    @Query(value = """
        SELECT 
            EXTRACT(HOUR FROM operation_date) as hour,
            EXTRACT(DOW FROM operation_date) as dayOfWeek,
            COUNT(*) as count
        FROM daily_operation_log
        WHERE operation_date BETWEEN :startDate AND :endDate
        GROUP BY hour, dayOfWeek
        ORDER BY hour, dayOfWeek
        """, nativeQuery = true)
    List<ActivityHeatmapProjection> getActivityHeatmap(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // NEW: Most active users
    @Query(value = """
        SELECT 
            performed_by as user,
            COUNT(*) as operationsCount
        FROM daily_operation_log
        WHERE operation_date BETWEEN :startDate AND :endDate
        GROUP BY performed_by
        ORDER BY operationsCount DESC
        LIMIT 10
        """, nativeQuery = true)
    List<ActiveUserProjection> getMostActiveUsers(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
```

### 3. Projection Interfaces

```java
// Treasury projections
public interface TreasuryMetricsProjection {
    Double getTotalToDeposit();
    Double getTotalDeposited();
    Double getTotalRemaining();
    Double getAvgDepositRate();
    Integer getTotalDeposits();
    Double getAvgDelayDays();
    Integer getTotalLateDeposits();
}

public interface TreasuryByCommercialProjection {
    String getCollector();
    Double getTotalToDeposit();
    Double getTotalDeposited();
    Double getTotalRemaining();
    Double getDepositRate();
    Integer getDepositsCount();
    Double getAvgDelayDays();
    Integer getLateDepositsCount();
}

public interface LateDepositProjection {
    String getCollector();
    LocalDate getDate();
    Double getAmountRemaining();
    Double getDelayDays();
}

// Cash/Credit projections
public interface CashCreditMetricsProjection {
    Integer getCashSalesCount();
    Double getCashSalesAmount();
    Integer getCreditSalesCount();
    Double getCreditSalesAmount();
    Double getCashRatio();
    Double getAvgCashBasket();
    Double getAvgCreditBasket();
}

public interface CashCreditTrendProjection {
    LocalDate getDate();
    Double getCashAmount();
    Double getCreditAmount();
}

// Tontine projections
public interface TontineMetricsProjection {
    Integer getActiveAdhesions();
    Integer getNewAdhesions();
    Integer getCollectionsCount();
    Double getCollectionsAmount();
    Integer getDeliveriesCount();
    Double getDeliveriesAmount();
    Double getCollectionRate();
    Double getDeliveryRate();
    Double getAvgCollectionAmount();
    Double getRetentionRate();
}

public interface TontineByCommercialProjection {
    String getCollector();
    Integer getActiveAdhesions();
    Integer getCollectionsCount();
    Double getCollectionsAmount();
    Double getCollectionRate();
}

// Audit projections
public interface OperationVolumeProjection {
    String getOperationType();
    Long getCount();
}

public interface ActivityHeatmapProjection {
    Integer getHour();
    Integer getDayOfWeek();
    Long getCount();
}

public interface ActiveUserProjection {
    String getUser();
    Long getOperationsCount();
}
```

## Data Models

### Entity: TreasuryAnalyticsDaily

```java
@Entity
@Table(name = "treasury_analytics_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"date", "collector"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TreasuryAnalyticsDaily {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "date", nullable = false)
    private LocalDate date;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "amount_to_deposit", nullable = false)
    private Double amountToDeposit = 0.0;
    
    @Column(name = "amount_deposited", nullable = false)
    private Double amountDeposited = 0.0;
    
    @Column(name = "amount_remaining", nullable = false)
    private Double amountRemaining = 0.0;
    
    @Column(name = "deposit_rate", nullable = false)
    private Double depositRate = 0.0;
    
    @Column(name = "deposits_count", nullable = false)
    private Integer depositsCount = 0;
    
    @Column(name = "avg_delay_days")
    private Double avgDelayDays;
    
    @Column(name = "late_deposits_count", nullable = false)
    private Integer lateDepositsCount = 0;
    
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

### Entity: CashCreditAnalyticsDaily

```java
@Entity
@Table(name = "cash_credit_analytics_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"date", "collector"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CashCreditAnalyticsDaily {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "date", nullable = false)
    private LocalDate date;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "cash_sales_count", nullable = false)
    private Integer cashSalesCount = 0;
    
    @Column(name = "cash_sales_amount", nullable = false)
    private Double cashSalesAmount = 0.0;
    
    @Column(name = "credit_sales_count", nullable = false)
    private Integer creditSalesCount = 0;
    
    @Column(name = "credit_sales_amount", nullable = false)
    private Double creditSalesAmount = 0.0;
    
    @Column(name = "cash_ratio", nullable = false)
    private Double cashRatio = 0.0;
    
    @Column(name = "credit_ratio", nullable = false)
    private Double creditRatio = 0.0;
    
    @Column(name = "avg_cash_basket", nullable = false)
    private Double avgCashBasket = 0.0;
    
    @Column(name = "avg_credit_basket", nullable = false)
    private Double avgCreditBasket = 0.0;
    
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

### Entity: TontineAnalyticsMonthly

```java
@Entity
@Table(name = "tontine_analytics_monthly",
       uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month", "collector"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TontineAnalyticsMonthly {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "year", nullable = false)
    private Integer year;
    
    @Column(name = "month", nullable = false)
    private Integer month;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "active_adhesions", nullable = false)
    private Integer activeAdhesions = 0;
    
    @Column(name = "new_adhesions", nullable = false)
    private Integer newAdhesions = 0;
    
    @Column(name = "collections_count", nullable = false)
    private Integer collectionsCount = 0;
    
    @Column(name = "collections_amount", nullable = false)
    private Double collectionsAmount = 0.0;
    
    @Column(name = "deliveries_count", nullable = false)
    private Integer deliveriesCount = 0;
    
    @Column(name = "deliveries_amount", nullable = false)
    private Double deliveriesAmount = 0.0;
    
    @Column(name = "collection_rate", nullable = false)
    private Double collectionRate = 0.0;
    
    @Column(name = "delivery_rate", nullable = false)
    private Double deliveryRate = 0.0;
    
    @Column(name = "avg_collection_amount", nullable = false)
    private Double avgCollectionAmount = 0.0;
    
    @Column(name = "retention_rate", nullable = false)
    private Double retentionRate = 0.0;
    
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



### 4. New BI Services

#### 4.1 BiTreasuryService

```java
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiTreasuryService {
    
    private final TreasuryAnalyticsRepository treasuryRepository;
    private final CashDepositRepository cashDepositRepository;
    
    public TreasuryMetricsDto getTreasuryMetrics(LocalDate startDate, LocalDate endDate) {
        TreasuryMetricsProjection projection = treasuryRepository.getTreasuryMetrics(startDate, endDate);
        return mapToDto(projection);
    }
    
    public List<TreasuryByCommercialDto> getTreasuryByCommercial(LocalDate startDate, LocalDate endDate) {
        List<TreasuryByCommercialProjection> projections = 
            treasuryRepository.getTreasuryByCommercial(startDate, endDate);
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public List<LateDepositDto> getLateDeposits() {
        List<LateDepositProjection> projections = treasuryRepository.getLateDeposits();
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public CashInCirculationDto getCashInCirculation() {
        // Calculate total cash not yet deposited
        List<TreasuryByCommercialProjection> projections = 
            treasuryRepository.getTreasuryByCommercial(LocalDate.now().minusDays(30), LocalDate.now());
        
        Double totalCashInCirculation = projections.stream()
            .mapToDouble(TreasuryByCommercialProjection::getTotalRemaining)
            .sum();
        
        return new CashInCirculationDto(totalCashInCirculation, projections.size());
    }
}
```

#### 4.2 BiCashCreditAnalyticsService

```java
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiCashCreditAnalyticsService {
    
    private final CashCreditAnalyticsRepository cashCreditRepository;
    
    public CashCreditMetricsDto getCashCreditMetrics(LocalDate startDate, LocalDate endDate) {
        CashCreditMetricsProjection projection = 
            cashCreditRepository.getCashCreditMetrics(startDate, endDate);
        return mapToDto(projection);
    }
    
    public List<CashCreditTrendDto> getCashCreditTrends(LocalDate startDate, LocalDate endDate) {
        List<CashCreditTrendProjection> projections = 
            cashCreditRepository.getCashCreditTrends(startDate, endDate);
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
}
```

#### 4.3 BiTontineService

```java
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiTontineService {
    
    private final TontineAnalyticsRepository tontineRepository;
    
    public TontineMetricsDto getTontineMetrics(Integer year, Integer month) {
        TontineMetricsProjection projection = tontineRepository.getTontineMetrics(year, month);
        return mapToDto(projection);
    }
    
    public List<TontineByCommercialDto> getTontineByCommercial(Integer year, Integer month) {
        List<TontineByCommercialProjection> projections = 
            tontineRepository.getTontineByCommercial(year, month);
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public List<TontineAdhesionTrendDto> getAdhesionsTrends(Integer startYear, Integer startMonth, 
                                                             Integer endYear, Integer endMonth) {
        // Query aggregated data for trend analysis
        // Implementation details...
    }
}
```

#### 4.4 BiAuditService

```java
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiAuditService {
    
    private final DailyOperationLogRepository operationLogRepository;
    
    public List<OperationVolumeDto> getOperationVolume(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        List<OperationVolumeProjection> projections = 
            operationLogRepository.getOperationVolume(startDateTime, endDateTime);
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public List<ActivityHeatmapDto> getActivityHeatmap(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        List<ActivityHeatmapProjection> projections = 
            operationLogRepository.getActivityHeatmap(startDateTime, endDateTime);
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public List<ActiveUserDto> getMostActiveUsers(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        List<ActiveUserProjection> projections = 
            operationLogRepository.getMostActiveUsers(startDateTime, endDateTime);
        return projections.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
}
```

### 5. REST Controllers

#### 5.1 BiTreasuryController

```java
@RestController
@RequestMapping("/api/v1/bi/treasury")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class BiTreasuryController {
    
    private final BiTreasuryService treasuryService;
    
    @GetMapping("/overview")
    public Response<TreasuryMetricsDto> getTreasuryOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        TreasuryMetricsDto metrics = treasuryService.getTreasuryMetrics(startDate, endDate);
        return Response.ok(metrics);
    }
    
    @GetMapping("/by-commercial")
    public Response<List<TreasuryByCommercialDto>> getTreasuryByCommercial(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        List<TreasuryByCommercialDto> metrics = treasuryService.getTreasuryByCommercial(startDate, endDate);
        return Response.ok(metrics);
    }
    
    @GetMapping("/late-deposits")
    public Response<List<LateDepositDto>> getLateDeposits() {
        List<LateDepositDto> lateDeposits = treasuryService.getLateDeposits();
        return Response.ok(lateDeposits);
    }
    
    @GetMapping("/cash-in-circulation")
    public Response<CashInCirculationDto> getCashInCirculation() {
        CashInCirculationDto cash = treasuryService.getCashInCirculation();
        return Response.ok(cash);
    }
}
```

#### 5.2 BiTontineController

```java
@RestController
@RequestMapping("/api/v1/bi/tontine")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class BiTontineController {
    
    private final BiTontineService tontineService;
    
    @GetMapping("/overview")
    public Response<TontineMetricsDto> getTontineOverview(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        
        if (year == null) year = LocalDate.now().getYear();
        if (month == null) month = LocalDate.now().getMonthValue();
        
        TontineMetricsDto metrics = tontineService.getTontineMetrics(year, month);
        return Response.ok(metrics);
    }
    
    @GetMapping("/by-commercial")
    public Response<List<TontineByCommercialDto>> getTontineByCommercial(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        
        if (year == null) year = LocalDate.now().getYear();
        if (month == null) month = LocalDate.now().getMonthValue();
        
        List<TontineByCommercialDto> metrics = tontineService.getTontineByCommercial(year, month);
        return Response.ok(metrics);
    }
    
    @GetMapping("/adhesions-trends")
    public Response<List<TontineAdhesionTrendDto>> getAdhesionsTrends(
            @RequestParam(required = false) Integer startYear,
            @RequestParam(required = false) Integer startMonth,
            @RequestParam(required = false) Integer endYear,
            @RequestParam(required = false) Integer endMonth) {
        
        // Default to last 12 months
        if (startYear == null || startMonth == null) {
            LocalDate start = LocalDate.now().minusMonths(12);
            startYear = start.getYear();
            startMonth = start.getMonthValue();
        }
        if (endYear == null || endMonth == null) {
            endYear = LocalDate.now().getYear();
            endMonth = LocalDate.now().getMonthValue();
        }
        
        List<TontineAdhesionTrendDto> trends = 
            tontineService.getAdhesionsTrends(startYear, startMonth, endYear, endMonth);
        return Response.ok(trends);
    }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Properties

**Property 1: Treasury Aggregation Correctness**

*For any* date range, the sum of treasury analytics (amount to deposit, amount deposited, amount remaining) should match the sum of individual CashDeposit records for that period.

**Validates: Requirements 1.2, 1.3, 1.4**

**Property 2: Cash vs Credit Ratio Consistency**

*For any* date range, the cash ratio plus credit ratio should equal 100%, and the total sales amount should equal cash sales amount plus credit sales amount.

**Validates: Requirements 2.2, 2.3**

**Property 3: Tontine Rate Calculations**

*For any* month, the collection rate should be (collections count / expected collections) × 100, and the delivery rate should be (deliveries count / collections count) × 100, both bounded between 0 and 100.

**Validates: Requirements 3.6, 3.7**

**Property 4: Performance Bounds**

*For any* BI query (treasury, cash/credit, Tontine, audit), the execution time should be less than 2 seconds for annual data and less than 500ms for monthly data.

**Validates: Requirements 8.5, 8.6**

**Property 5: Real-time Aggregation Updates**

*For any* new CashDeposit or DailyOperationLog entry, the corresponding aggregation table should be updated within the same transaction or within 1 second.

**Validates: Requirements 7.1, 7.2, 7.3**

**Property 6: API Backward Compatibility**

*For any* new BI endpoint, the response structure should follow the Response<T> pattern with status, statusCode, message, service, and data fields.

**Validates: Requirements 8.1, 8.2, 8.3**

**Property 7: Migration Idempotency**

*For any* aggregation table, running the historical data migration script multiple times should produce the same final state without duplicating records.

**Validates: Requirements 9.4, 9.6**

**Property 8: Deposit Rate Bounds**

*For any* treasury analytics record, the deposit rate should be between 0 and 100, calculated as (amount deposited / amount to deposit) × 100.

**Validates: Requirements 1.3**

## Error Handling

### Database Errors

**Connection Failures:**
- Retry logic with exponential backoff
- Return HTTP 503 Service Unavailable

**Query Timeouts:**
- Set query timeout to 30 seconds
- Log slow queries
- Return HTTP 504 Gateway Timeout

**Constraint Violations:**
- Handle unique constraint violations with upsert logic
- Log violations
- Return HTTP 409 Conflict if user-facing

### Aggregation Errors

**Scheduler Failures:**
- Log error with full stack trace
- Send alert to monitoring system
- Continue with next scheduled execution

**Data Inconsistency:**
- Detect via validation checks
- Trigger automatic re-aggregation
- Log warning for manual review

### API Errors

**Invalid Parameters:**
- Validate date ranges (startDate <= endDate)
- Return HTTP 400 Bad Request with clear message

**Missing Data:**
- Return empty arrays instead of null
- Return zero values for metrics when no data

**Authorization Errors:**
- Return HTTP 403 Forbidden for insufficient roles
- Log unauthorized access attempts

## Testing Strategy

### Dual Testing Approach

**Unit Tests:**
- Verify specific SQL queries return expected results
- Test edge cases (empty results, single record)
- Test error handling (null values, invalid dates)
- Test scheduler configuration

**Property-Based Tests:**
- Generate random date ranges and verify aggregation correctness
- Generate random deposits and verify real-time updates
- Test API compatibility with random valid inputs
- Test migration idempotency with random data sets

### Property Test Configuration

- **Framework:** JUnit 5 + jqwik
- **Iterations:** Minimum 100 iterations per property test
- **Test Data:** Use jqwik generators for dates, amounts, deposits

### Test Tagging

Each property-based test must include a comment referencing the design property:

```java
/**
 * Feature: bi-treasury-tontine-enrichment, Property 1: Treasury Aggregation Correctness
 * Validates: Requirements 1.2, 1.3, 1.4
 */
@Property
void treasuryAggregationMatchesIndividualDeposits(@ForAll("dateRanges") DateRange range) {
    // Test implementation
}
```

## Implementation Notes

### Migration Strategy

**Phase 1: Create Tables**
- Run Flyway migration to create aggregation tables
- Create indexes
- No data yet

**Phase 2: Populate Historical Data**
- Run batch job to populate aggregation tables from existing data
- Monitor progress via logs

**Phase 3: Deploy New Services**
- Deploy new service implementations
- Services read from aggregation tables
- Real-time updates start working

**Phase 4: Enable Schedulers**
- Activate daily/monthly schedulers
- Monitor for errors

### Rollback Plan

If issues arise:
1. Revert service code to previous version
2. Aggregation tables remain but unused
3. Can retry after fixing issues
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
