-- sql
-- File: `src/main/resources/db/migration/V3__unique_tontine_per_collector.sql`

-- Create unique index per collector and year for in-progress promoter tontines
CREATE UNIQUE INDEX ux_credit_tontine_collector_year_inprogress_promoter
    ON credit (
               collector,
        (EXTRACT(YEAR FROM begin_date))
        )
    WHERE type = 'TONTINE'
  AND status = 'INPROGRESS'
  AND client_type = 'PROMOTER';