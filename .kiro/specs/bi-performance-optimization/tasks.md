# Implementation Plan: BI Performance Optimization

## Overview

This implementation plan addresses the OutOfMemoryException issue in the BI Dashboard by replacing in-memory Stream processing with database-level SQL aggregations. The approach involves creating aggregation tables, implementing optimized repository methods with native queries, updating services to use these optimized queries, and maintaining full API backward compatibility.

## Tasks

- [ ] 1. Create database migration script for aggregation tables
  - Create Flyway migration file V19__bi_performance_optimization.sql
  - Define sales_analytics_daily table with indexes
  - Define collection_analytics_daily table with indexes
  - Define commercial_performance_monthly table with indexes
  - Define portfolio_snapshot table with indexes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 2. Create entity classes for aggregation tables
  - [ ] 2.1 Create SalesAnalyticsDaily entity
    - Define all fields matching database schema
    - Add JPA annotations (@Entity, @Table, @Column)
    - Add unique constraint on (sale_date, collector, client_type)
    - Add @PrePersist and @PreUpdate for timestamps
    - _Requirements: 2.1_

  - [ ] 2.2 Create CollectionAnalyticsDaily entity
    - Define all fields matching database schema
    - Add JPA annotations
    - Add unique constraint on (collection_date, collector)
    - Add timestamp management
    - _Requirements: 2.2_

  - [ ] 2.3 Create CommercialPerformanceMonthly entity
    - Define all fields matching database schema
    - Add JPA annotations
    - Add unique constraint on (collector, year, month)
    - Add timestamp management
    - _Requirements: 2.3_

  - [ ] 2.4 Create PortfolioSnapshot entity
    - Define all fields matching database schema
    - Add JPA annotations
    - Add unique constraint on snapshot_date
    - Add timestamp management
    - _Requirements: 2.4_

- [ ] 3. Create projection interfaces for native queries
  - [ ] 3.1 Create SalesMetricsProjection interface
    - Define getter methods for salesCount, totalAmount, totalProfit, avgAmount
    - _Requirements: 7.1, 7.2_

  - [ ] 3.2 Create SalesTrendProjection interface
    - Define getter methods for date, salesCount, totalAmount, totalProfit, avgAmount
    - _Requirements: 7.1, 7.2_

  - [ ] 3.3 Create CommercialSalesProjection interface
    - Define getter methods for collector, salesCount, totalAmount, totalProfit, avgAmount, totalCollected
    - _Requirements: 7.1, 7.2_

  - [ ] 3.4 Create PortfolioMetricsProjection interface
    - Define getter methods for activeCount, totalOutstanding, totalOverdue, par7, par15, par30
    - _Requirements: 7.1, 7.2_

  - [ ] 3.5 Create OverdueRangeProjection interface
    - Define getter methods for range, creditsCount, totalAmount
    - _Requirements: 7.1, 7.2_

  - [ ] 3.6 Create ArticlePerformanceProjection interface
    - Define getter methods for articleId, articleName, category, quantitySold, totalRevenue, totalProfit, turnoverRate, stockQuantity
    - _Requirements: 7.1, 7.2_

- [ ] 4. Add optimized native query methods to CreditRepository
  - [ ] 4.1 Add getSalesMetrics method with native SQL
    - Use @Query annotation with native SQL
    - Aggregate with SUM, COUNT, AVG
    - Filter by date range, type, and client_type
    - Return SalesMetricsProjection
    - _Requirements: 1.1, 7.3_

  - [ ]* 4.2 Write unit test for getSalesMetrics
    - Test with known data set
    - Verify aggregation correctness
    - Test edge cases (empty results, single record)
    - _Requirements: 1.1_

  - [ ] 4.3 Add getSalesTrends method with native SQL
    - Use @Query with GROUP BY accounting_date
    - Order by date
    - Return List<SalesTrendProjection>
    - _Requirements: 1.1, 7.3_

  - [ ]* 4.4 Write unit test for getSalesTrends
    - Test with multiple days of data
    - Verify grouping by date
    - Verify ordering
    - _Requirements: 1.1_

  - [ ] 4.5 Add getSalesByCommercial method with native SQL
    - Use @Query with GROUP BY collector
    - Order by totalAmount DESC
    - Return List<CommercialSalesProjection>
    - _Requirements: 1.1, 7.5_

  - [ ]* 4.6 Write unit test for getSalesByCommercial
    - Test with multiple commercials
    - Verify grouping and ordering
    - _Requirements: 1.1_

  - [ ] 4.7 Add getPortfolioMetrics method with native SQL
    - Use single query with multiple CASE WHEN for PAR calculations
    - Calculate all metrics in one query
    - Return PortfolioMetricsProjection
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 4.8 Write property test for getPortfolioMetrics
    - **Property 8: Portfolio Metrics Consistency**
    - **Validates: Requirements 4.3**

  - [ ] 4.9 Add getOverdueAnalysis method with native SQL
    - Use CASE WHEN to group by date ranges
    - Calculate 4 ranges in single query
    - Return List<OverdueRangeProjection>
    - _Requirements: 5.1, 5.2_

  - [ ]* 4.10 Write property test for getOverdueAnalysis
    - **Property 7: Overdue Range Completeness**
    - **Validates: Requirements 5.2**

  - [ ] 4.11 Add getArticlePerformance method with native SQL
    - Use JOIN between articles, credit_articles, and credit
    - GROUP BY article
    - Order by totalRevenue DESC
    - Return List<ArticlePerformanceProjection>
    - _Requirements: 6.1, 6.2_

  - [ ]* 4.12 Write unit test for getArticlePerformance
    - Test with multiple articles
    - Verify JOIN and aggregation
    - Verify ordering by revenue
    - _Requirements: 6.1, 6.2_

- [ ] 5. Create new repository interfaces for aggregation tables
  - [ ] 5.1 Create SalesAggregationRepository
    - Extend JpaRepository<SalesAnalyticsDaily, Long>
    - Add findTrendsByDateRange method with native query
    - Add findByCommercial method with native query
    - Add findBySaleDateAndCollectorAndClientType method
    - _Requirements: 7.3_

  - [ ] 5.2 Create CollectionAggregationRepository
    - Extend JpaRepository<CollectionAnalyticsDaily, Long>
    - Add findByDateRange method
    - Add findByCollectionDateAndCollector method
    - _Requirements: 7.4_

  - [ ] 5.3 Create CommercialPerformanceRepository
    - Extend JpaRepository<CommercialPerformanceMonthly, Long>
    - Add findByYearAndMonth method
    - Add findByCollectorAndYearAndMonth method
    - _Requirements: 7.5_

  - [ ] 5.4 Create PortfolioSnapshotRepository
    - Extend JpaRepository<PortfolioSnapshot, Long>
    - Add findBySnapshotDate method
    - Add findLatest method
    - _Requirements: 2.4_

- [ ] 6. Checkpoint - Verify database layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Optimize BiDashboardService
  - [ ] 7.1 Replace getSalesMetrics implementation
    - Remove List<Credit> loading and Stream operations
    - Use creditRepository.getSalesMetrics(startDate, endDate)
    - Map projection to SalesMetricsDto
    - Maintain same DTO structure
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ]* 7.2 Write property test for getSalesMetrics optimization
    - **Property 1: SQL Aggregation Correctness**
    - **Validates: Requirements 1.1, 4.3, 5.2**

  - [ ]* 7.3 Write property test for getSalesMetrics performance
    - **Property 2: Performance Bounds**
    - **Validates: Requirements 1.3, 4.4, 5.4, 6.4**

  - [ ] 7.4 Replace getCollectionMetrics implementation
    - Use optimized SQL queries
    - Remove Stream operations
    - Maintain same DTO structure
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ] 7.5 Replace getPortfolioMetrics implementation
    - Use creditRepository.getPortfolioMetrics()
    - Remove List<Credit> loading
    - Map projection to PortfolioMetricsDto
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 8.2_

  - [ ]* 7.6 Write unit test for API compatibility
    - Compare response structure before/after optimization
    - Verify same HTTP status codes
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Optimize BiSalesAnalyticsService
  - [ ] 8.1 Replace getSalesTrends implementation
    - Use creditRepository.getSalesTrends(startDate, endDate)
    - Remove List<Credit> loading and grouping
    - Map projections to SalesTrendDto list
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ]* 8.2 Write property test for getSalesTrends performance
    - **Property 2: Performance Bounds (annual data)**
    - **Validates: Requirements 1.3**

  - [ ] 8.3 Replace getCommercialRanking implementation
    - Use creditRepository.getSalesByCommercial(startDate, endDate)
    - Remove Stream operations and manual grouping
    - Map projections to CommercialPerformanceDto list
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ] 8.4 Replace getArticlePerformance implementation
    - Use creditRepository.getArticlePerformance(startDate, endDate)
    - Remove nested loops and manual aggregation
    - Map projections to ArticlePerformanceDto list
    - _Requirements: 6.1, 6.2, 8.1, 8.2_

  - [ ]* 8.5 Write property test for getArticlePerformance performance
    - **Property 2: Performance Bounds**
    - **Validates: Requirements 6.4**

- [ ] 9. Optimize BiCollectionAnalyticsService
  - [ ] 9.1 Replace getCollectionTrends implementation
    - Use optimized SQL queries instead of loop
    - Remove List<Credit> loading
    - Map results to CollectionTrendDto list
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ] 9.2 Replace getOverdueAnalysis implementation
    - Use creditRepository.getOverdueAnalysis()
    - Remove multiple Stream filter operations
    - Map projections to OverdueAnalysisDto list
    - _Requirements: 5.1, 5.2, 8.1, 8.2_

  - [ ]* 9.3 Write property test for getOverdueAnalysis performance
    - **Property 2: Performance Bounds**
    - **Validates: Requirements 5.4**

- [ ] 10. Checkpoint - Verify service layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement real-time aggregation updates
  - [ ] 11.1 Create BiAggregationService
    - Add method updateSalesAggregation(Credit credit)
    - Add method updateCollectionAggregation(CreditTimeline payment)
    - Use upsert logic (find existing or create new)
    - Handle null values gracefully
    - _Requirements: 3.1, 3.2_

  - [ ]* 11.2 Write property test for real-time updates
    - **Property 3: Real-time Aggregation Updates**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 11.3 Integrate with CreditService
    - Call biAggregationService.updateSalesAggregation after credit creation
    - Wrap in try-catch to not fail credit creation
    - Log errors
    - _Requirements: 3.1_

  - [ ] 11.4 Integrate with payment recording
    - Call biAggregationService.updateCollectionAggregation after payment
    - Wrap in try-catch
    - Log errors
    - _Requirements: 3.2_

  - [ ]* 11.5 Write unit test for error handling
    - Verify credit creation succeeds even if aggregation fails
    - Verify errors are logged
    - _Requirements: 3.5_

- [ ] 12. Implement scheduled aggregation refresh
  - [ ] 12.1 Create BiSchedulerService
    - Add @Scheduled method refreshDailyAggregations()
    - Configure cron expression for 2 AM daily
    - Recalculate sales_analytics_daily for yesterday
    - Recalculate collection_analytics_daily for yesterday
    - Log execution time
    - _Requirements: 3.3_

  - [ ] 12.2 Add monthly performance calculation
    - Add @Scheduled method calculateMonthlyPerformance()
    - Configure cron for 1st of month at 2 AM
    - Calculate commercial_performance_monthly for previous month
    - Log execution time
    - _Requirements: 3.4_

  - [ ] 12.3 Add portfolio snapshot scheduler
    - Add @Scheduled method createPortfolioSnapshot()
    - Configure cron for daily at 2 AM
    - Save portfolio state to portfolio_snapshot table
    - _Requirements: 2.4_

  - [ ]* 12.4 Write property test for scheduler error handling
    - **Property 6: Error Handling Without System Failure**
    - **Validates: Requirements 3.5, 10.2**

- [ ] 13. Create historical data migration script
  - [ ] 13.1 Create BiDataMigrationService
    - Add method migrateHistoricalSalesData()
    - Query all credits grouped by date and collector
    - Insert into sales_analytics_daily
    - Use INSERT ON CONFLICT DO UPDATE for idempotency
    - Log progress every 1000 records
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 13.2 Add collection data migration
    - Add method migrateHistoricalCollectionData()
    - Query all payments grouped by date and collector
    - Insert into collection_analytics_daily
    - Use upsert logic
    - _Requirements: 9.1, 9.2_

  - [ ] 13.3 Add commercial performance migration
    - Add method migrateCommercialPerformance()
    - Calculate monthly performance for all historical months
    - Insert into commercial_performance_monthly
    - _Requirements: 9.1, 9.2_

  - [ ]* 13.4 Write property test for migration idempotency
    - **Property 5: Migration Idempotency**
    - **Validates: Requirements 9.4**

  - [ ] 13.5 Create REST endpoint for manual migration trigger
    - Add POST /api/v1/bi/admin/migrate endpoint
    - Require ADMIN role
    - Call migration service methods
    - Return migration status
    - _Requirements: 9.1_

- [ ] 14. Add performance monitoring and logging
  - [ ] 14.1 Add execution time logging to BI services
    - Use @Around aspect or manual timing
    - Log execution time for all BI methods
    - Log warning if > 2 seconds
    - _Requirements: 10.1, 10.2_

  - [ ] 14.2 Add memory usage monitoring
    - Log heap usage before/after large queries
    - Add metrics endpoint for memory stats
    - _Requirements: 10.4_

  - [ ] 14.3 Add aggregation error logging
    - Log all scheduler failures with stack trace
    - Log aggregation update failures
    - Include context (date, collector, etc.)
    - _Requirements: 10.3_

- [ ] 15. Integration testing
  - [ ]* 15.1 Write integration test for full API flow
    - Test GET /api/v1/bi/dashboard/overview with 1 year data
    - Verify no OutOfMemoryException
    - Verify response time < 2 seconds
    - _Requirements: 1.1, 1.3_

  - [ ]* 15.2 Write integration test for API compatibility
    - **Property 4: API Backward Compatibility**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

  - [ ]* 15.3 Write integration test for sales trends endpoint
    - Test GET /api/v1/bi/sales/trends with annual data
    - Verify performance
    - Verify data correctness
    - _Requirements: 1.1, 1.3_

  - [ ]* 15.4 Write integration test for commercial ranking
    - Test GET /api/v1/bi/sales/by-commercial
    - Verify correct ordering
    - Verify performance
    - _Requirements: 1.1_

  - [ ]* 15.5 Write integration test for portfolio metrics
    - Test GET /api/v1/bi/dashboard/portfolio/metrics
    - Verify PAR calculations
    - Verify performance < 500ms
    - _Requirements: 4.3, 4.4_

  - [ ]* 15.6 Write integration test for overdue analysis
    - Test GET /api/v1/bi/collections/overdue-analysis
    - Verify 4 ranges returned
    - Verify performance < 1 second
    - _Requirements: 5.2, 5.4_

- [ ] 16. Final checkpoint - Complete system verification
  - Run all tests (unit, property, integration)
  - Verify Flyway migration executes successfully
  - Verify no OutOfMemoryException with annual queries
  - Verify all API endpoints maintain backward compatibility
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows with real database
