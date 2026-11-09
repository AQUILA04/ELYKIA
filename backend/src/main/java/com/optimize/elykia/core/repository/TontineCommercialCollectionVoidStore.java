package com.optimize.elykia.core.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Copies and voids one commercial's enabled collections for a session in set-based SQL.
 * Member totals are replayed in Java: the society-share policy depends on line order.
 */
@Repository
@RequiredArgsConstructor
public class TontineCommercialCollectionVoidStore {

    private final EntityManager entityManager;

    public record Preview(
            long collectionsCount,
            double collectionsAmount,
            long membersAffected,
            long membersWithOtherCollections,
            double preservedAmount,
            long deliveryCollectionsCount,
            int reportDays
    ) {
    }

    public Preview preview(Long sessionId, String commercial) {
        Query query = entityManager.createNativeQuery("""
                WITH target AS (
                    SELECT tc.id,
                           tc.amount,
                           tc.tontine_member_id,
                           tc.collection_date,
                           tc.date_reg,
                           COALESCE(tc.is_delivery_collection, false) AS delivery
                    FROM tontine_collection tc
                    JOIN tontine_member tm ON tm.id = tc.tontine_member_id
                    WHERE tm.tontine_session_id = :sessionId
                      AND tc.visibility = 'ENABLED'
                      AND UPPER(tc.commercial_username) = UPPER(:commercial)
                )
                SELECT
                    (SELECT COUNT(*) FROM target),
                    (SELECT COALESCE(SUM(amount), 0) FROM target),
                    (SELECT COUNT(DISTINCT tontine_member_id) FROM target),
                    (SELECT COUNT(DISTINCT t.tontine_member_id) FROM target t
                        WHERE EXISTS (
                            SELECT 1 FROM tontine_collection other
                            WHERE other.tontine_member_id = t.tontine_member_id
                              AND other.visibility = 'ENABLED'
                              AND UPPER(other.commercial_username) <> UPPER(:commercial)
                        )),
                    (SELECT COALESCE(SUM(other.amount), 0)
                        FROM tontine_collection other
                        WHERE other.visibility = 'ENABLED'
                          AND UPPER(other.commercial_username) <> UPPER(:commercial)
                          AND other.tontine_member_id IN (SELECT tontine_member_id FROM target)),
                    (SELECT COUNT(*) FROM target WHERE delivery),
                    (SELECT COUNT(*) FROM (
                        SELECT CAST(collection_date AS date) AS report_date
                        FROM target WHERE collection_date IS NOT NULL
                        UNION
                        SELECT CAST(date_reg AS date) FROM target WHERE date_reg IS NOT NULL
                    ) days)
                """);
        query.setParameter("sessionId", sessionId);
        query.setParameter("commercial", commercial);
        Object[] row = (Object[]) query.getSingleResult();
        return new Preview(
                asLong(row[0]),
                asDouble(row[1]),
                asLong(row[2]),
                asLong(row[3]),
                asDouble(row[4]),
                asLong(row[5]),
                (int) asLong(row[6]));
    }

    public int insertLines(Long runId, Long sessionId, String commercial, String auditUser) {
        Query query = entityManager.createNativeQuery("""
                INSERT INTO tontine_collection_reset_line (
                    reg_user_id, date_reg, visibility,
                    run_id, collection_id, tontine_member_id,
                    client_name, client_code, quarter,
                    amount, collection_date, commercial_username,
                    reference, society_share_amount, is_delivery_collection,
                    contribution_month, recorded_at
                )
                SELECT :auditUser, NOW(), 'ENABLED',
                       :runId, tc.id, tc.tontine_member_id,
                       TRIM(BOTH FROM CONCAT(COALESCE(c.firstname, ''), ' ', COALESCE(c.lastname, ''))),
                       c.code,
                       COALESCE(NULLIF(BTRIM(c.quarter), ''), 'N/A'),
                       tc.amount, tc.collection_date, tc.commercial_username,
                       tc.reference, tc.society_share_amount, tc.is_delivery_collection,
                       tc.contribution_month, tc.date_reg
                FROM tontine_collection tc
                JOIN tontine_member tm ON tm.id = tc.tontine_member_id
                JOIN client c ON c.id = tm.client_id
                WHERE tm.tontine_session_id = :sessionId
                  AND tc.visibility = 'ENABLED'
                  AND UPPER(tc.commercial_username) = UPPER(:commercial)
                """);
        bind(query, runId, sessionId, commercial, auditUser);
        return query.executeUpdate();
    }

    public int insertMembers(Long runId, Long sessionId, String commercial, String auditUser) {
        Query query = entityManager.createNativeQuery("""
                INSERT INTO tontine_collection_reset_member (
                    reg_user_id, date_reg, visibility,
                    run_id, tontine_member_id, client_name, client_code,
                    total_contribution_before, society_share_before, available_contribution_before,
                    validated_months_before, current_month_days_before,
                    removed_amount, kept_amount
                )
                SELECT :auditUser, NOW(), 'ENABLED',
                       :runId, tm.id,
                       TRIM(BOTH FROM CONCAT(COALESCE(c.firstname, ''), ' ', COALESCE(c.lastname, ''))),
                       c.code,
                       COALESCE(tm.total_contribution, 0),
                       COALESCE(tm.society_share, 0),
                       COALESCE(tm.available_contribution, 0),
                       COALESCE(tm.validated_months, 0),
                       COALESCE(tm.current_month_days, 0),
                       COALESCE(removed.amount, 0),
                       COALESCE(kept.amount, 0)
                FROM tontine_member tm
                JOIN client c ON c.id = tm.client_id
                JOIN (
                    SELECT tc.tontine_member_id, SUM(tc.amount) AS amount
                    FROM tontine_collection tc
                    WHERE tc.visibility = 'ENABLED'
                      AND UPPER(tc.commercial_username) = UPPER(:commercial)
                    GROUP BY tc.tontine_member_id
                ) removed ON removed.tontine_member_id = tm.id
                LEFT JOIN (
                    SELECT tc.tontine_member_id, SUM(tc.amount) AS amount
                    FROM tontine_collection tc
                    WHERE tc.visibility = 'ENABLED'
                      AND UPPER(tc.commercial_username) <> UPPER(:commercial)
                    GROUP BY tc.tontine_member_id
                ) kept ON kept.tontine_member_id = tm.id
                WHERE tm.tontine_session_id = :sessionId
                """);
        bind(query, runId, sessionId, commercial, auditUser);
        return query.executeUpdate();
    }

    public int insertReportDays(Long runId, Long sessionId, String commercial, String auditUser) {
        Query query = entityManager.createNativeQuery("""
                INSERT INTO tontine_collection_reset_report_day (
                    reg_user_id, date_reg, visibility,
                    run_id, commercial_username, report_date,
                    collections_amount_before, collections_count_before,
                    catchup_amount_before, catchup_count_before,
                    amount_to_deposit_before,
                    amount_deposited, tontine_amount_deposited
                )
                SELECT :auditUser, NOW(), 'ENABLED',
                       :runId, :commercial, days.report_date,
                       COALESCE(r.tontine_collections_amount, 0),
                       COALESCE(r.tontine_collections_count, 0),
                       COALESCE(r.tontine_catchup_amount, 0),
                       COALESCE(r.tontine_catchup_count, 0),
                       COALESCE(r.total_amount_to_deposit, 0),
                       COALESCE(r.total_amount_deposited, 0),
                       COALESCE(r.total_tontine_amount_deposited, 0)
                FROM (
                    SELECT DISTINCT CAST(tc.collection_date AS date) AS report_date
                    FROM tontine_collection tc
                    JOIN tontine_member tm ON tm.id = tc.tontine_member_id
                    WHERE tm.tontine_session_id = :sessionId
                      AND tc.visibility = 'ENABLED'
                      AND UPPER(tc.commercial_username) = UPPER(:commercial)
                      AND tc.collection_date IS NOT NULL
                    UNION
                    SELECT DISTINCT CAST(tc.date_reg AS date)
                    FROM tontine_collection tc
                    JOIN tontine_member tm ON tm.id = tc.tontine_member_id
                    WHERE tm.tontine_session_id = :sessionId
                      AND tc.visibility = 'ENABLED'
                      AND UPPER(tc.commercial_username) = UPPER(:commercial)
                      AND tc.date_reg IS NOT NULL
                ) days
                LEFT JOIN daily_commercial_report r
                    ON r."date" = days.report_date
                   AND UPPER(r.commercial_username) = UPPER(:commercial)
                """);
        bind(query, runId, sessionId, commercial, auditUser);
        return query.executeUpdate();
    }

    public int softDelete(Long sessionId, String commercial, String auditUser) {
        Query query = entityManager.createNativeQuery("""
                UPDATE tontine_collection tc
                SET visibility = 'DELETED',
                    mod_user_id = :auditUser,
                    date_mod = NOW()
                FROM tontine_member tm
                WHERE tc.tontine_member_id = tm.id
                  AND tm.tontine_session_id = :sessionId
                  AND tc.visibility = 'ENABLED'
                  AND UPPER(tc.commercial_username) = UPPER(:commercial)
                """);
        query.setParameter("sessionId", sessionId);
        query.setParameter("commercial", commercial);
        query.setParameter("auditUser", auditUser);
        return query.executeUpdate();
    }

    public void updateMembersAfter(Long runId, String auditUser) {
        Query query = entityManager.createNativeQuery("""
                UPDATE tontine_collection_reset_member snap
                SET total_contribution_after = COALESCE(tm.total_contribution, 0),
                    society_share_after = COALESCE(tm.society_share, 0),
                    available_contribution_after = COALESCE(tm.available_contribution, 0),
                    validated_months_after = COALESCE(tm.validated_months, 0),
                    current_month_days_after = COALESCE(tm.current_month_days, 0),
                    mod_user_id = :auditUser,
                    date_mod = NOW()
                FROM tontine_member tm
                WHERE snap.tontine_member_id = tm.id
                  AND snap.run_id = :runId
                """);
        query.setParameter("runId", runId);
        query.setParameter("auditUser", auditUser);
        query.executeUpdate();
    }

    public void updateReportDaysAfter(Long runId) {
        Query query = entityManager.createNativeQuery("""
                UPDATE tontine_collection_reset_report_day snap
                SET collections_amount_after = COALESCE(r.tontine_collections_amount, 0),
                    collections_count_after = COALESCE(r.tontine_collections_count, 0),
                    catchup_amount_after = COALESCE(r.tontine_catchup_amount, 0),
                    catchup_count_after = COALESCE(r.tontine_catchup_count, 0),
                    amount_to_deposit_after = COALESCE(r.total_amount_to_deposit, 0),
                    amount_deposited = COALESCE(r.total_amount_deposited, snap.amount_deposited),
                    tontine_amount_deposited = COALESCE(r.total_tontine_amount_deposited, snap.tontine_amount_deposited),
                    date_mod = NOW()
                FROM daily_commercial_report r
                WHERE snap.run_id = :runId
                  AND r."date" = snap.report_date
                  AND UPPER(r.commercial_username) = UPPER(snap.commercial_username)
                """);
        query.setParameter("runId", runId);
        query.executeUpdate();
    }

    public List<Long> findMemberIds(Long runId) {
        return longs("""
                SELECT DISTINCT tontine_member_id
                FROM tontine_collection_reset_line
                WHERE run_id = :runId
                ORDER BY tontine_member_id
                """, runId);
    }

    public List<Long> findCollectionIds(Long runId) {
        return longs("""
                SELECT collection_id
                FROM tontine_collection_reset_line
                WHERE run_id = :runId
                ORDER BY collection_id
                """, runId);
    }

    public List<LocalDate> findReportDates(Long runId) {
        Query query = entityManager.createNativeQuery("""
                SELECT report_date
                FROM tontine_collection_reset_report_day
                WHERE run_id = :runId
                ORDER BY report_date
                """);
        query.setParameter("runId", runId);
        List<?> rows = query.getResultList();
        List<LocalDate> dates = new ArrayList<>(rows.size());
        for (Object row : rows) {
            dates.add(asDate(row));
        }
        return dates;
    }

    public String dominantCommercialUsername(Long runId) {
        Query query = entityManager.createNativeQuery("""
                SELECT commercial_username
                FROM tontine_collection_reset_line
                WHERE run_id = :runId
                GROUP BY commercial_username
                ORDER BY COUNT(*) DESC, commercial_username
                LIMIT 1
                """);
        query.setParameter("runId", runId);
        List<?> rows = query.getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return null;
        }
        return rows.get(0).toString();
    }

    public double sumLineAmount(Long runId) {
        Query query = entityManager.createNativeQuery("""
                SELECT COALESCE(SUM(amount), 0)
                FROM tontine_collection_reset_line
                WHERE run_id = :runId
                """);
        query.setParameter("runId", runId);
        return asDouble(query.getSingleResult());
    }

    private List<Long> longs(String sql, Long runId) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("runId", runId);
        List<?> rows = query.getResultList();
        List<Long> ids = new ArrayList<>(rows.size());
        for (Object row : rows) {
            ids.add(asLong(row));
        }
        return ids;
    }

    private static void bind(Query query, Long runId, Long sessionId, String commercial, String auditUser) {
        query.setParameter("runId", runId);
        query.setParameter("sessionId", sessionId);
        query.setParameter("commercial", commercial);
        query.setParameter("auditUser", auditUser);
    }

    private static long asLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static double asDouble(Object value) {
        if (value == null) {
            return 0d;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    private static LocalDate asDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof Date sql) {
            return sql.toLocalDate();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toLocalDate();
        }
        throw new IllegalStateException("Date de rapport inattendue: " + value);
    }
}
