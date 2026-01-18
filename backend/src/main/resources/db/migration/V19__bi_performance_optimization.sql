-- BI Performance Optimization - Aggregation Tables
-- Version: 19
-- Description: Create aggregation tables for optimized BI queries to prevent OutOfMemoryException

-- 1. Sales Analytics Daily Table
-- Stores daily sales aggregations to avoid recalculating on every request
CREATE TABLE IF NOT EXISTS sales_analytics_daily (
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

-- Indexes for sales analytics
CREATE INDEX IF NOT EXISTS idx_sales_analytics_date ON sales_analytics_daily(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_collector ON sales_analytics_daily(collector);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_client_type ON sales_analytics_daily(client_type);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_date_range ON sales_analytics_daily(sale_date, collector);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_composite ON sales_analytics_daily(sale_date, collector, client_type);

-- 2. Collection Analytics Daily Table
-- Stores daily collection aggregations
CREATE TABLE IF NOT EXISTS collection_analytics_daily (
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

-- Indexes for collection analytics
CREATE INDEX IF NOT EXISTS idx_collection_analytics_date ON collection_analytics_daily(collection_date);
CREATE INDEX IF NOT EXISTS idx_collection_analytics_collector ON collection_analytics_daily(collector);
CREATE INDEX IF NOT EXISTS idx_collection_analytics_date_collector ON collection_analytics_daily(collection_date, collector);

-- 3. Commercial Performance Monthly Table
-- Stores monthly performance metrics per commercial
CREATE TABLE IF NOT EXISTS commercial_performance_monthly (
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

-- Indexes for commercial performance
CREATE INDEX IF NOT EXISTS idx_commercial_perf_collector ON commercial_performance_monthly(collector);
CREATE INDEX IF NOT EXISTS idx_commercial_perf_period ON commercial_performance_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_commercial_perf_composite ON commercial_performance_monthly(collector, year, month);

-- 4. Portfolio Snapshot Table
-- Stores portfolio state snapshots for historical tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshot (
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

-- Indexes for portfolio snapshot
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshot_date ON portfolio_snapshot(snapshot_date);

-- Comments for documentation
COMMENT ON TABLE sales_analytics_daily IS 'Daily sales aggregations for BI performance optimization';
COMMENT ON TABLE collection_analytics_daily IS 'Daily collection aggregations for BI performance optimization';
COMMENT ON TABLE commercial_performance_monthly IS 'Monthly commercial performance metrics for BI performance optimization';
COMMENT ON TABLE portfolio_snapshot IS 'Portfolio state snapshots for historical tracking';

-- Add comments to key columns
COMMENT ON COLUMN sales_analytics_daily.sale_date IS 'Date of the sales transactions';
COMMENT ON COLUMN sales_analytics_daily.collector IS 'Commercial responsible for the sales';
COMMENT ON COLUMN sales_analytics_daily.sales_count IS 'Number of sales transactions';
COMMENT ON COLUMN sales_analytics_daily.total_sales IS 'Total sales amount';
COMMENT ON COLUMN sales_analytics_daily.total_profit IS 'Total profit from sales';
COMMENT ON COLUMN collection_analytics_daily.collection_date IS 'Date of the collections';
COMMENT ON COLUMN collection_analytics_daily.payment_count IS 'Number of payments collected';
COMMENT ON COLUMN collection_analytics_daily.total_collected IS 'Total amount collected';
COMMENT ON COLUMN commercial_performance_monthly.year IS 'Year of the performance metrics';
COMMENT ON COLUMN commercial_performance_monthly.month IS 'Month of the performance metrics';
COMMENT ON COLUMN portfolio_snapshot.snapshot_date IS 'Date of the portfolio snapshot';
COMMENT ON COLUMN portfolio_snapshot.par_7 IS 'Portfolio at Risk - Credits overdue by 7+ days';
COMMENT ON COLUMN portfolio_snapshot.par_15 IS 'Portfolio at Risk - Credits overdue by 15+ days';
COMMENT ON COLUMN portfolio_snapshot.par_30 IS 'Portfolio at Risk - Credits overdue by 30+ days';
