UPDATE daily_commercial_report dcr
SET total_advances_amount = sub.total_advance
FROM (
    SELECT begin_date, collector, SUM(advance) as total_advance
    FROM credit
    WHERE advance > 0 AND begin_date IS NOT NULL AND collector IS NOT NULL
    GROUP BY begin_date, collector
) sub
WHERE dcr.date = sub.begin_date AND dcr.commercial_username = sub.collector;
