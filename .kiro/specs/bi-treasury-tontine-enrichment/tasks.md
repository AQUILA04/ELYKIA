# Implementation Plan: BI Dashboard Enrichment

## Overview

This implementation plan enriches the existing BI Dashboard with new analytics modules for treasury management, cash vs credit analysis, Tontine activity, orders tracking, audit analysis, and customer acquisition. The data is already captured in existing tables (`DailyCommercialReport`, `DailyOperationLog`, `CashDeposit`). The approach involves creating new aggregation tables, implementing new BI services following the same patterns as the existing BI system, and exposing new REST endpoints.

## Tasks

- [ ] 1. Create database migration script for new aggregation tables
  - Create Flyway migration file V17__bi_enrichment_tables.sql
  - Define treasury_analytics_daily table with indexes
  - Define cash_credit_analytics_daily table with indexes
  - Define tontine_analytics_monthly table with indexes
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Create entity classes for new aggregation tables
  - [ ] 2.1 Create TreasuryAnalyticsDaily entity
    - Define all fields matching database schema
    - Add JPA annotations (@Entity, @Table, @Column)
    - Add unique constraint on (date, collector)
    - Add @PrePersist and @PreUpdate for timestamps
    - _Requirements: 1.1_

  - [ ] 2.2 Create CashCreditAnalyticsDaily entity
    - Define all fields matching database schema
    - Add JPA annotations
    - Add unique constraint on (date, collector)
    - Add timestamp management
    - _Requirements: 2.1_

  - [ ] 2.3 Create TontineAnalyticsMonthly entity
    - Define all fields matching database schema
    - Add JPA annotations
    - Add unique constraint on (year, month, collector)
    - Add timestamp management
    - _Requirements: 3.1_

- [ ] 3. Create projection interfaces for native queries
  - [ ] 3.1 Create Treasury projection interfaces
    - TreasuryMetricsProjection
    - TreasuryByCommercialProjection
    - LateDepositProjection
    - _Requirements: 1.6, 1.7, 1.8_

  - [ ] 3.2 Create Cash/Credit projection interfaces
    - CashCreditMetricsProjection
    - CashCreditTrendProjection
    - _Requirements: 2.6, 2.7_

  - [ ] 3.3 Create Tontine projection interfaces
    - TontineMetricsProjection
    - TontineByCommercialProjection
    - _Requirements: 3.10, 3.13_

  - [ ] 3.4 Create Audit projection interfaces
    - OperationVolumeProjection
    - ActivityHeatmapProjection
    - ActiveUserProjection
    - _Requirements: 5.7, 5.8, 5.10_

- [ ] 4. Create new repository interfaces
  - [ ] 4.1 Create TreasuryAnalyticsRepository
    - Extend JpaRepository<TreasuryAnalyticsDaily, Long>
    - Add getTreasuryMetrics method with native query
    - Add getTreasuryByCommercial method with GROUP BY
    - Add getLateDeposits method filtering by delay > 3 days
    - Add findByDateAndCollector method
    - _Requirements: 1.6, 1.7, 1.8, 1.9_

  - [ ]* 4.2 Write unit test for TreasuryAnalyticsRepository
    - Test getTreasuryMetrics with known data
    - Test getLateDeposits filtering
    - Test edge cases (empty results, single record)
    - _Requirements: 1.6, 1.7, 1.8_

  - [ ] 4.3 Create CashCreditAnalyticsRepository
    - Extend JpaRepository<CashCreditAnalyticsDaily, Long>
    - Add getCashCreditMetrics method with native query
    - Add getCashCreditTrends method with GROUP BY date
    - Add findByDateAndCollector method
    - _Requirements: 2.6, 2.7_

  - [ ]* 4.4 Write unit test for CashCreditAnalyticsRepository
    - Test getCashCreditMetrics aggregation
    - Test getCashCreditTrends ordering
    - _Requirements: 2.6, 2.7_

  - [ ] 4.5 Create TontineAnalyticsRepository
    - Extend JpaRepository<TontineAnalyticsMonthly, Long>
    - Add getTontineMetrics method with native query
    - Add getTontineByCommercial method with GROUP BY
    - Add findByYearAndMonthAndCollector method
    - _Requirements: 3.10, 3.13_

  - [ ]* 4.6 Write unit test for TontineAnalyticsRepository
    - Test getTontineMetrics aggregation
    - Test rate calculations (collection_rate, delivery_rate)
    - _Requirements: 3.10, 3.13_

  - [ ] 4.7 Enrich DailyOperationLogRepository
    - Add getOperationVolume method with GROUP BY operation_type
    - Add getActivityHeatmap method with EXTRACT(HOUR), EXTRACT(DOW)
    - Add getMostActiveUsers method with GROUP BY performed_by
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 4.8 Write unit test for DailyOperationLogRepository enrichments
    - Test getOperationVolume grouping
    - Test getActivityHeatmap hour/day extraction
    - Test getMostActiveUsers ordering
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 5. Checkpoint - Verify database layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement BiTreasuryService
  - [ ] 6.1 Create BiTreasuryService class
    - Add getTreasuryMetrics method using repository
    - Add getTreasuryByCommercial method
    - Add getLateDeposits method
    - Add getCashInCirculation method
    - Map projections to DTOs
    - _Requirements: 1.6, 1.7, 1.8, 1.9_

  - [ ]* 6.2 Write property test for treasury aggregation correctness
    - **Property 1: Treasury Aggregation Correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [ ]* 6.3 Write property test for deposit rate bounds
    - **Property 8: Deposit Rate Bounds**
    - **Validates: Requirements 1.3**

  - [ ]* 6.4 Write unit test for getTreasuryMetrics
    - Test with known data set
    - Verify aggregation correctness
    - Test edge cases (no deposits, all deposited)
    - _Requirements: 1.6_

- [ ] 7. Implement BiCashCreditAnalyticsService
  - [ ] 7.1 Create BiCashCreditAnalyticsService class
    - Add getCashCreditMetrics method using repository
    - Add getCashCreditTrends method
    - Map projections to DTOs
    - _Requirements: 2.6, 2.7_

  - [ ]* 7.2 Write property test for cash/credit ratio consistency
    - **Property 2: Cash vs Credit Ratio Consistency**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 7.3 Write unit test for getCashCreditMetrics
    - Test ratio calculations
    - Test basket average calculations
    - _Requirements: 2.6_

- [ ] 8. Implement BiTontineService
  - [ ] 8.1 Create BiTontineService class
    - Add getTontineMetrics method using repository
    - Add getTontineByCommercial method
    - Add getAdhesionsTrends method
    - Map projections to DTOs
    - _Requirements: 3.10, 3.11, 3.13_

  - [ ]* 8.2 Write property test for Tontine rate calculations
    - **Property 3: Tontine Rate Calculations**
    - **Validates: Requirements 3.6, 3.7**

  - [ ]* 8.3 Write unit test for getTontineMetrics
    - Test rate calculations (collection_rate, delivery_rate)
    - Test retention rate calculation
    - _Requirements: 3.10_

- [ ] 9. Implement BiAuditService
  - [ ] 9.1 Create BiAuditService class
    - Add getOperationVolume method using repository
    - Add getActivityHeatmap method
    - Add getMostActiveUsers method
    - Map projections to DTOs
    - _Requirements: 5.7, 5.8, 5.10_

  - [ ]* 9.2 Write unit test for getOperationVolume
    - Test grouping by operation type
    - Test ordering by count
    - _Requirements: 5.7_

- [ ] 10. Checkpoint - Verify service layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement REST controllers
  - [ ] 11.1 Create BiTreasuryController
    - Add GET /api/v1/bi/treasury/overview endpoint
    - Add GET /api/v1/bi/treasury/by-commercial endpoint
    - Add GET /api/v1/bi/treasury/late-deposits endpoint
    - Add GET /api/v1/bi/treasury/cash-in-circulation endpoint
    - Add @PreAuthorize for ADMIN, MANAGER roles
    - Use Response<T> wrapper for all responses
    - _Requirements: 1.6, 1.7, 1.8, 1.9, 8.1, 8.2_

  - [ ]* 11.2 Write integration test for BiTreasuryController
    - Test all endpoints with valid data
    - Test authentication and authorization
    - Verify Response<T> structure
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 11.3 Create BiTontineController
    - Add GET /api/v1/bi/tontine/overview endpoint
    - Add GET /api/v1/bi/tontine/by-commercial endpoint
    - Add GET /api/v1/bi/tontine/adhesions-trends endpoint
    - Add @PreAuthorize for ADMIN, MANAGER roles
    - Use Response<T> wrapper
    - _Requirements: 3.10, 3.11, 3.13, 8.1, 8.2_

  - [ ]* 11.4 Write integration test for BiTontineController
    - Test all endpoints with valid data
    - Test year/month parameter handling
    - _Requirements: 8.1, 8.2_

  - [ ] 11.5 Enrich BiSalesAnalyticsController
    - Add GET /api/v1/bi/sales/cash-vs-credit endpoint
    - Add GET /api/v1/bi/sales/cash-trends endpoint
    - Add GET /api/v1/bi/sales/cash-by-commercial endpoint
    - _Requirements: 2.6, 2.7, 2.8_

  - [ ]* 11.6 Write integration test for cash/credit endpoints
    - Test cash-vs-credit endpoint
    - Test cash-trends endpoint
    - _Requirements: 2.6, 2.7_

  - [ ] 11.7 Create BiAuditController
    - Add GET /api/v1/bi/audit/operations-volume endpoint
    - Add GET /api/v1/bi/audit/activity-heatmap endpoint
    - Add GET /api/v1/bi/audit/most-active-users endpoint
    - _Requirements: 5.7, 5.8, 5.10_

  - [ ]* 11.8 Write integration test for BiAuditController
    - Test all audit endpoints
    - Verify heatmap data structure
    - _Requirements: 5.7, 5.8, 5.10_

- [ ] 12. Implement real-time aggregation updates
  - [ ] 12.1 Create BiEnrichmentAggregationService
    - Add method updateTreasuryAggregation(CashDeposit deposit)
    - Add method updateCashCreditAggregation(DailyOperationLog log)
    - Use upsert logic (find existing or create new)
    - Handle null values gracefully
    - _Requirements: 7.1, 7.2_

  - [ ]* 12.2 Write property test for real-time updates
    - **Property 5: Real-time Aggregation Updates**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ] 12.3 Integrate with CashDepositService
    - Call biEnrichmentAggregationService.updateTreasuryAggregation after deposit creation
    - Wrap in try-catch to not fail deposit creation
    - Log errors
    - _Requirements: 7.1_

  - [ ] 12.4 Integrate with DailyOperationLog creation
    - Call biEnrichmentAggregationService.updateCashCreditAggregation after log creation
    - Wrap in try-catch
    - Log errors
    - _Requirements: 7.2_

  - [ ]* 12.5 Write unit test for error handling
    - Verify deposit creation succeeds even if aggregation fails
    - Verify errors are logged
    - _Requirements: 7.7_

- [ ] 13. Implement scheduled aggregation refresh
  - [ ] 13.1 Create BiEnrichmentSchedulerService
    - Add @Scheduled method refreshTreasuryAggregations()
    - Configure cron expression for 3 AM daily
    - Recalculate treasury_analytics_daily for yesterday
    - Log execution time
    - _Requirements: 7.4_

  - [ ] 13.2 Add cash/credit aggregation refresh
    - Add @Scheduled method refreshCashCreditAggregations()
    - Configure cron for 3 AM daily
    - Recalculate cash_credit_analytics_daily for yesterday
    - _Requirements: 7.5_

  - [ ] 13.3 Add Tontine aggregation refresh
    - Add @Scheduled method refreshTontineAggregations()
    - Configure cron for 1st of month at 3 AM
    - Calculate tontine_analytics_monthly for previous month
    - _Requirements: 7.6_

  - [ ]* 13.4 Write unit test for scheduler error handling
    - Verify scheduler logs errors without crashing
    - _Requirements: 7.7_

- [ ] 14. Create historical data migration scripts
  - [ ] 14.1 Create BiEnrichmentDataMigrationService
    - Add method migrateTreasuryData()
    - Query CashDeposit grouped by date and collector
    - Insert into treasury_analytics_daily
    - Use INSERT ON CONFLICT DO UPDATE for idempotency
    - Log progress every 1000 records
    - _Requirements: 9.1, 9.4, 9.5_

  - [ ] 14.2 Add cash/credit data migration
    - Add method migrateCashCreditData()
    - Query DailyOperationLog for sales grouped by date and collector
    - Insert into cash_credit_analytics_daily
    - Use upsert logic
    - _Requirements: 9.2, 9.4_

  - [ ] 14.3 Add Tontine data migration
    - Add method migrateTontineData()
    - Query DailyCommercialReport for Tontine activity grouped by month
    - Insert into tontine_analytics_monthly
    - _Requirements: 9.3, 9.4_

  - [ ]* 14.4 Write property test for migration idempotency
    - **Property 7: Migration Idempotency**
    - **Validates: Requirements 9.4, 9.6**

  - [ ] 14.5 Create REST endpoint for manual migration trigger
    - Add POST /api/v1/bi/admin/migrate-enrichment endpoint
    - Require ADMIN role
    - Call migration service methods
    - Return migration status
    - _Requirements: 9.1_

- [ ] 15. Add performance monitoring and logging
  - [ ] 15.1 Add execution time logging to new BI services
    - Use @Around aspect or manual timing
    - Log execution time for all new BI methods
    - Log warning if > 2 seconds
    - _Requirements: 8.7, 8.8_

  - [ ] 15.2 Add aggregation error logging
    - Log all scheduler failures with stack trace
    - Log aggregation update failures
    - Include context (date, collector, etc.)
    - _Requirements: 7.7_

- [ ] 16. Update API documentation
  - [ ] 16.1 Update BI_DASHBOARD_API_REFERENCE.md
    - Document all treasury endpoints
    - Document all Tontine endpoints
    - Document all cash/credit endpoints
    - Document all audit endpoints
    - Include request/response examples
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 16.2 Create curl examples for all new endpoints
    - Treasury overview example
    - Tontine metrics example
    - Cash vs credit example
    - Audit heatmap example
    - _Requirements: 10.2_

- [ ] 17. Integration testing
  - [ ]* 17.1 Write integration test for treasury module
    - Test GET /api/v1/bi/treasury/overview with real data
    - Verify response time < 500ms
    - Verify data correctness
    - _Requirements: 1.6, 8.5, 8.6_

  - [ ]* 17.2 Write integration test for Tontine module
    - Test GET /api/v1/bi/tontine/overview with real data
    - Verify rate calculations
    - Verify performance
    - _Requirements: 3.10, 8.5, 8.6_

  - [ ]* 17.3 Write integration test for cash/credit module
    - Test GET /api/v1/bi/sales/cash-vs-credit
    - Verify ratio calculations
    - Verify performance
    - _Requirements: 2.6, 8.5, 8.6_

  - [ ]* 17.4 Write property test for performance bounds
    - **Property 4: Performance Bounds**
    - **Validates: Requirements 8.5, 8.6**

  - [ ]* 17.5 Write property test for API backward compatibility
    - **Property 6: API Backward Compatibility**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 18. Final checkpoint - Complete system verification
  - Run all tests (unit, property, integration)
  - Verify Flyway migration executes successfully
  - Verify all new endpoints return data correctly
  - Verify performance meets requirements (< 2s for annual, < 500ms for monthly)
  - Verify API documentation is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows with real database
- This spec builds on top of bi-performance-optimization patterns
