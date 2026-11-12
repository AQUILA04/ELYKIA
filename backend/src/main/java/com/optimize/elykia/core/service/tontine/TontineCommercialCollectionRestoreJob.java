package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.service.tontine.allocation.TontineAmountHistoryHelper;
import com.optimize.elykia.core.service.tontine.allocation.V2TontineAllocationPolicy;

import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Rétablissement ponctuel du run d'annulation 5 (COM003, session 2026).
 * Réactive les lignes archivées, annule les trois collectes de test COM003,
 * recalcule les membres avec la politique V2, et ne réécrit aucune collecte
 * d'un autre commercial.
 *
 * <p>Ne s'exécute qu'avec {@code ELYKIA_RESTORE_CONFIRM=RESTORE-COM003-RUN-5}.
 * Sans {@code ELYKIA_RESTORE_APPLY=APPLY}, la transaction est annulée après contrôle.
 */
public final class TontineCommercialCollectionRestoreJob {

    static final long RUN_ID = 5L;
    static final String COMMERCIAL = "COM003";
    static final long[] CANCEL_IDS = {41196L, 41197L, 41208L};
    static final String CONFIRMATION = "RESTORE-COM003-RUN-5";
    private static final String AUDIT_USER = "restore-com003";

    private TontineCommercialCollectionRestoreJob() {
    }

    public static void main(String[] args) throws Exception {
        requireConfirmation(System.getenv("ELYKIA_RESTORE_CONFIRM"));
        boolean apply = shouldApply(System.getenv("ELYKIA_RESTORE_APPLY"));
        String host = env("PGHOST", "127.0.0.1");
        String port = env("PGPORT", "5432");
        String database = requiredEnv("PGDATABASE");
        String user = requiredEnv("PGUSER");
        String password = requiredEnv("PGPASSWORD");
        String url = "jdbc:postgresql://" + host + ":" + port + "/" + database;
        try (Connection connection = DriverManager.getConnection(url, user, password)) {
            connection.setAutoCommit(false);
            try {
                Summary summary = restore(connection);
                System.out.println(summary);
                if (apply) {
                    connection.commit();
                    System.out.println("COMMIT");
                } else {
                    connection.rollback();
                    System.out.println("ROLLBACK contrôle seul, aucune donnée écrite");
                }
            } catch (Exception exception) {
                connection.rollback();
                throw exception;
            }
        }
    }

    static void requireConfirmation(String confirm) {
        if (!CONFIRMATION.equals(confirm)) {
            throw new IllegalStateException("Confirmation refusée.");
        }
    }

    static boolean shouldApply(String apply) {
        return "APPLY".equals(apply);
    }

    static Summary restore(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET lock_timeout = '20s'");
        }
        long sessionId = lockAndValidateRun(connection);
        prepareMembers(connection);
        int kept = snapshotOtherCommercials(connection);
        int reenabled = reenableArchivedLines(connection);
        int cancelled = cancelTestCollections(connection);
        Map<Long, MemberLines> linesByMember = loadLines(connection);
        V2TontineAllocationPolicy policy = new V2TontineAllocationPolicy(new TontineAmountHistoryHelper(null));
        List<MemberUpdate> memberUpdates = new ArrayList<>();
        List<LineUpdate> lineUpdates = new ArrayList<>();
        for (MemberLines memberLines : linesByMember.values()) {
            policy.recalculateMemberFromCollections(memberLines.member, memberLines.lines);
            double expected = 0;
            for (TontineCollection line : memberLines.lines) {
                expected += line.getAmount() != null ? line.getAmount() : 0;
            }
            if (Math.abs(memberLines.member.getTotalContribution() - expected) > 0.05) {
                throw new SQLException("Compteur incohérent pour le membre " + memberLines.member.getId());
            }
            memberUpdates.add(new MemberUpdate(memberLines.member));
            for (TontineCollection line : memberLines.lines) {
                if (COMMERCIAL.equalsIgnoreCase(line.getCommercialUsername())) {
                    lineUpdates.add(new LineUpdate(line));
                }
            }
        }
        writeMembers(connection, memberUpdates);
        writeCom003Lines(connection, lineUpdates);
        assertRestore(connection, reenabled, cancelled, kept);
        refreshSessionRevenue(connection, sessionId);
        int reports = refreshReports(connection);
        writeJournal(connection, reenabled);
        return new Summary(sessionId, reenabled, cancelled, memberUpdates.size(), lineUpdates.size(), kept, reports);
    }

    private static long lockAndValidateRun(Connection connection) throws SQLException {
        String sql = """
                SELECT r.session_id, r.status, r.scope, r.target_commercial_username,
                       r.collections_count, r.collections_amount, s.status, s.year
                FROM tontine_collection_reset_run r
                JOIN tontine_session s ON s.id = r.session_id
                WHERE r.id = ?
                FOR UPDATE OF s
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, RUN_ID);
            try (ResultSet rows = statement.executeQuery()) {
                if (!rows.next()) {
                    throw new SQLException("Archive " + RUN_ID + " introuvable.");
                }
                if (!"COMPLETED".equals(rows.getString(2)) || !"COMMERCIAL".equals(rows.getString(3))) {
                    throw new SQLException("L'archive " + RUN_ID + " n'est pas une annulation commerciale terminée.");
                }
                if (!COMMERCIAL.equalsIgnoreCase(rows.getString(4))) {
                    throw new SQLException("L'archive " + RUN_ID + " ne concerne pas " + COMMERCIAL + ".");
                }
                if (!"ACTIVE".equals(rows.getString(7)) || rows.getInt(8) != 2026) {
                    throw new SQLException("La session 2026 n'est pas active.");
                }
                long sessionId = rows.getLong(1);
                assertNoBusyRun(connection, sessionId);
                assertCancelTargets(connection);
                return sessionId;
            }
        }
    }

    private static void assertNoBusyRun(Connection connection, long sessionId) throws SQLException {
        String sql = """
                SELECT COUNT(*)
                FROM tontine_collection_reset_run
                WHERE session_id = ?
                  AND status IN ('PENDING', 'ARCHIVING', 'RESETTING')
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, sessionId);
            try (ResultSet rows = statement.executeQuery()) {
                rows.next();
                if (rows.getInt(1) > 0) {
                    throw new SQLException("Une archive ou une réinitialisation est déjà en cours.");
                }
            }
        }
    }

    private static void assertCancelTargets(Connection connection) throws SQLException {
        String sql = """
                SELECT COUNT(*)
                FROM tontine_collection
                WHERE id IN (?, ?, ?)
                  AND visibility = 'ENABLED'
                  AND UPPER(commercial_username) = ?
                  AND id NOT IN (
                      SELECT collection_id FROM tontine_collection_reset_line WHERE run_id = ?
                  )
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, CANCEL_IDS[0]);
            statement.setLong(2, CANCEL_IDS[1]);
            statement.setLong(3, CANCEL_IDS[2]);
            statement.setString(4, COMMERCIAL);
            statement.setLong(5, RUN_ID);
            try (ResultSet rows = statement.executeQuery()) {
                rows.next();
                if (rows.getInt(1) != CANCEL_IDS.length) {
                    throw new SQLException("Les collectes de test COM003 ne sont pas toutes annulables.");
                }
            }
        }
    }

    private static void prepareMembers(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TEMP TABLE restore_members ON COMMIT DROP AS
                    SELECT DISTINCT tontine_member_id AS id
                    FROM tontine_collection_reset_line
                    WHERE run_id = 5
                    UNION
                    SELECT tontine_member_id
                    FROM tontine_collection
                    WHERE id IN (41196, 41197, 41208)
                    """);
            try (ResultSet locked = statement.executeQuery("""
                    SELECT tm.id
                    FROM tontine_member tm
                    JOIN restore_members m ON m.id = tm.id
                    FOR UPDATE OF tm
                    """)) {
                while (locked.next()) {
                    locked.getLong(1);
                }
            }
        }
    }

    private static int snapshotOtherCommercials(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TEMP TABLE restore_keep ON COMMIT DROP AS
                    SELECT tc.id, tc.amount, tc.commercial_username, tc.visibility,
                           tc.society_share_amount, tc.contribution_month, tc.reference
                    FROM tontine_collection tc
                    JOIN restore_members m ON m.id = tc.tontine_member_id
                    WHERE UPPER(tc.commercial_username) <> 'COM003'
                    """);
            try (ResultSet rows = statement.executeQuery("SELECT COUNT(*) FROM restore_keep")) {
                rows.next();
                return rows.getInt(1);
            }
        }
    }

    private static int reenableArchivedLines(Connection connection) throws SQLException {
        String sql = """
                UPDATE tontine_collection tc
                SET visibility = 'ENABLED',
                    mod_user_id = ?,
                    date_mod = NOW()
                FROM tontine_collection_reset_line l
                WHERE l.run_id = ?
                  AND l.collection_id = tc.id
                  AND tc.visibility = 'DELETED'
                  AND UPPER(tc.commercial_username) = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, AUDIT_USER);
            statement.setLong(2, RUN_ID);
            statement.setString(3, COMMERCIAL);
            int updated = statement.executeUpdate();
            try (PreparedStatement expected = connection.prepareStatement(
                    "SELECT COUNT(*) FROM tontine_collection_reset_line WHERE run_id = ?")) {
                expected.setLong(1, RUN_ID);
                try (ResultSet rows = expected.executeQuery()) {
                    rows.next();
                    if (updated != rows.getInt(1)) {
                        throw new SQLException("Réactivation incomplète : " + updated
                                + " lignes au lieu de " + rows.getInt(1) + ".");
                    }
                }
            }
            return updated;
        }
    }

    private static int cancelTestCollections(Connection connection) throws SQLException {
        String sql = """
                UPDATE tontine_collection
                SET visibility = 'DELETED',
                    mod_user_id = ?,
                    date_mod = NOW()
                WHERE id IN (?, ?, ?)
                  AND visibility = 'ENABLED'
                  AND UPPER(commercial_username) = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, AUDIT_USER);
            statement.setLong(2, CANCEL_IDS[0]);
            statement.setLong(3, CANCEL_IDS[1]);
            statement.setLong(4, CANCEL_IDS[2]);
            statement.setString(5, COMMERCIAL);
            int updated = statement.executeUpdate();
            if (updated != CANCEL_IDS.length) {
                throw new SQLException("Annulation des collectes de test incomplète : " + updated + ".");
            }
            return updated;
        }
    }

    private static Map<Long, MemberLines> loadLines(Connection connection) throws SQLException {
        Map<Long, MemberLines> members = new LinkedHashMap<>();
        String memberSql = """
                SELECT tm.id, tm.amount
                FROM tontine_member tm
                JOIN restore_members m ON m.id = tm.id
                ORDER BY tm.id
                """;
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery(memberSql)) {
            while (rows.next()) {
                TontineMember member = new TontineMember();
                member.setId(rows.getLong(1));
                member.setAmount(rows.getObject(2) == null ? null : rows.getDouble(2));
                member.setAmountHistory(new ArrayList<>());
                members.put(member.getId(), new MemberLines(member));
            }
        }
        String historySql = """
                SELECT h.tontine_member_id, h.amount, h.start_date, h.end_date
                FROM tontine_member_amount_history h
                JOIN restore_members m ON m.id = h.tontine_member_id
                ORDER BY h.tontine_member_id, h.start_date, h.id
                """;
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery(historySql)) {
            while (rows.next()) {
                MemberLines memberLines = members.get(rows.getLong(1));
                TontineMemberAmountHistory history = new TontineMemberAmountHistory();
                history.setAmount(rows.getDouble(2));
                history.setStartDate(rows.getDate(3).toLocalDate());
                Date end = rows.getDate(4);
                history.setEndDate(end == null ? null : end.toLocalDate());
                memberLines.member.getAmountHistory().add(history);
            }
        }
        String lineSql = """
                SELECT tc.id, tc.tontine_member_id, tc.amount, tc.collection_date,
                       tc.advance_to_next_month, tc.contribution_month, tc.commercial_username
                FROM tontine_collection tc
                JOIN restore_members m ON m.id = tc.tontine_member_id
                WHERE tc.visibility = 'ENABLED'
                ORDER BY tc.collection_date, tc.id
                """;
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery(lineSql)) {
            while (rows.next()) {
                if (rows.getTimestamp(4) == null) {
                    throw new SQLException("Collecte " + rows.getLong(1) + " sans date.");
                }
                TontineCollection line = new TontineCollection();
                line.setId(rows.getLong(1));
                line.setAmount(rows.getDouble(3));
                line.setCollectionDate(rows.getTimestamp(4).toLocalDateTime());
                line.setAdvanceToNextMonth(rows.getBoolean(5));
                Date month = rows.getDate(6);
                line.setContributionMonth(month == null ? null : month.toLocalDate());
                line.setCommercialUsername(rows.getString(7));
                members.get(rows.getLong(2)).lines.add(line);
            }
        }
        return members;
    }

    private static void writeMembers(Connection connection, List<MemberUpdate> updates) throws SQLException {
        String sql = """
                UPDATE tontine_member
                SET total_contribution = ?,
                    society_share = ?,
                    available_contribution = ?,
                    validated_months = ?,
                    current_month_days = ?,
                    mod_user_id = ?,
                    date_mod = NOW()
                WHERE id = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (MemberUpdate update : updates) {
                TontineMember member = update.member;
                statement.setDouble(1, safe(member.getTotalContribution()));
                statement.setDouble(2, safe(member.getSocietyShare()));
                statement.setDouble(3, safe(member.getAvailableContribution()));
                statement.setInt(4, member.getValidatedMonths() != null ? member.getValidatedMonths() : 0);
                statement.setInt(5, member.getCurrentMonthDays() != null ? member.getCurrentMonthDays() : 0);
                statement.setString(6, AUDIT_USER);
                statement.setLong(7, member.getId());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void writeCom003Lines(Connection connection, List<LineUpdate> updates) throws SQLException {
        String sql = """
                UPDATE tontine_collection
                SET society_share_amount = ?,
                    contribution_month = ?,
                    mod_user_id = ?,
                    date_mod = NOW()
                WHERE id = ?
                  AND UPPER(commercial_username) = ?
                  AND visibility = 'ENABLED'
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (LineUpdate update : updates) {
                TontineCollection line = update.line;
                statement.setDouble(1, safe(line.getSocietyShareAmount()));
                if (line.getContributionMonth() == null) {
                    statement.setNull(2, Types.DATE);
                } else {
                    statement.setDate(2, Date.valueOf(line.getContributionMonth()));
                }
                statement.setString(3, AUDIT_USER);
                statement.setLong(4, line.getId());
                statement.setString(5, COMMERCIAL);
                statement.addBatch();
            }
            int[] counts = statement.executeBatch();
            for (int count : counts) {
                if (count == 0 || count == Statement.EXECUTE_FAILED) {
                    throw new SQLException("Mise à jour d'une ligne COM003 refusée.");
                }
            }
        }
    }

    private static void assertRestore(Connection connection, int reenabled, int cancelled, int kept)
            throws SQLException {
        try (Statement statement = connection.createStatement()) {
            assertCount(statement, """
                    SELECT COUNT(*)
                    FROM tontine_collection tc
                    JOIN tontine_collection_reset_line l ON l.collection_id = tc.id AND l.run_id = 5
                    WHERE tc.visibility = 'ENABLED'
                      AND UPPER(tc.commercial_username) = 'COM003'
                    """, reenabled, "lignes COM003 réactivées");
            assertCount(statement, """
                    SELECT COUNT(*)
                    FROM tontine_collection
                    WHERE id IN (41196, 41197, 41208)
                      AND visibility = 'DELETED'
                      AND UPPER(commercial_username) = 'COM003'
                    """, cancelled, "collectes de test annulées");
            assertCount(statement, """
                    SELECT COUNT(*)
                    FROM restore_keep k
                    JOIN tontine_collection tc ON tc.id = k.id
                    WHERE tc.amount IS DISTINCT FROM k.amount
                       OR tc.visibility IS DISTINCT FROM k.visibility
                       OR tc.commercial_username IS DISTINCT FROM k.commercial_username
                       OR tc.society_share_amount IS DISTINCT FROM k.society_share_amount
                       OR tc.contribution_month IS DISTINCT FROM k.contribution_month
                       OR tc.reference IS DISTINCT FROM k.reference
                    """, 0, "collectes d'autres commerciaux modifiées");
            assertCount(statement, "SELECT COUNT(*) FROM restore_keep", kept, "collectes conservées");
            assertCount(statement, """
                    SELECT COUNT(*)
                    FROM restore_members m
                    JOIN tontine_member tm ON tm.id = m.id
                    LEFT JOIN (
                        SELECT tontine_member_id, SUM(amount) AS total
                        FROM tontine_collection
                        WHERE visibility = 'ENABLED'
                        GROUP BY tontine_member_id
                    ) sums ON sums.tontine_member_id = m.id
                    WHERE ABS(COALESCE(tm.total_contribution, 0) - COALESCE(sums.total, 0)) > 0.05
                    """, 0, "membres dont la mise ne correspond pas aux lignes actives");
        }
    }

    private static void refreshSessionRevenue(Connection connection, long sessionId) throws SQLException {
        String sql = """
                UPDATE tontine_session
                SET total_revenue = (
                        SELECT COALESCE(SUM(society_share), 0)
                        FROM tontine_member
                        WHERE tontine_session_id = ?
                          AND visibility = 'ENABLED'
                    ),
                    mod_user_id = ?,
                    date_mod = NOW()
                WHERE id = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, sessionId);
            statement.setString(2, AUDIT_USER);
            statement.setLong(3, sessionId);
            if (statement.executeUpdate() != 1) {
                throw new SQLException("Recette de session non mise à jour.");
            }
        }
    }

    private static int refreshReports(Connection connection) throws SQLException {
        List<LocalDate> dates = new ArrayList<>();
        String datesSql = """
                SELECT DISTINCT report_date
                FROM (
                    SELECT report_date
                    FROM tontine_collection_reset_report_day
                    WHERE run_id = 5
                    UNION
                    SELECT CAST(collection_date AS date)
                    FROM tontine_collection
                    WHERE id IN (41196, 41197, 41208)
                    UNION
                    SELECT CAST(date_reg AS date)
                    FROM tontine_collection
                    WHERE id IN (41196, 41197, 41208)
                ) days
                WHERE report_date IS NOT NULL
                ORDER BY report_date
                """;
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery(datesSql)) {
            while (rows.next()) {
                dates.add(rows.getDate(1).toLocalDate());
            }
        }
        String sql = """
                UPDATE daily_commercial_report r
                SET tontine_collections_amount = COALESCE(act.amount, 0),
                    tontine_collections_count = COALESCE(act.cnt, 0),
                    tontine_catchup_amount = COALESCE(cu.amount, 0),
                    tontine_catchup_count = COALESCE(cu.cnt, 0),
                    total_amount_to_deposit = GREATEST(0,
                        COALESCE(r.total_advances_amount, 0)
                        + COALESCE(r.collections_amount, 0)
                        + COALESCE(r.total_reliquat_generated_amount, 0)
                        - COALESCE(r.total_reliquat_used_amount, 0)
                        + COALESCE(act.amount, 0)
                        + COALESCE(r.new_accounts_balance, 0)),
                    mod_user_id = ?,
                    date_mod = NOW()
                FROM (
                    SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(id) AS cnt
                    FROM tontine_collection
                    WHERE UPPER(commercial_username) = ?
                      AND visibility = 'ENABLED'
                      AND collection_date >= ?
                      AND collection_date < ?
                ) act,
                (
                    SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(id) AS cnt
                    FROM tontine_collection
                    WHERE UPPER(commercial_username) = ?
                      AND visibility = 'ENABLED'
                      AND date_reg >= ?
                      AND date_reg < ?
                      AND (collection_date < ? OR collection_date >= ?)
                ) cu
                WHERE r."date" = ?
                  AND UPPER(r.commercial_username) = ?
                """;
        int updated = 0;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (LocalDate date : dates) {
                Timestamp start = Timestamp.valueOf(date.atStartOfDay());
                Timestamp end = Timestamp.valueOf(date.plusDays(1).atStartOfDay());
                statement.setString(1, AUDIT_USER);
                statement.setString(2, COMMERCIAL);
                statement.setTimestamp(3, start);
                statement.setTimestamp(4, end);
                statement.setString(5, COMMERCIAL);
                statement.setTimestamp(6, start);
                statement.setTimestamp(7, end);
                statement.setTimestamp(8, start);
                statement.setTimestamp(9, end);
                statement.setDate(10, Date.valueOf(date));
                statement.setString(11, COMMERCIAL);
                int count = statement.executeUpdate();
                if (count != 1) {
                    throw new SQLException("Rapport COM003 introuvable pour le " + date + " (" + count + ").");
                }
                updated += count;
            }
        }
        return updated;
    }

    private static void writeJournal(Connection connection, int reenabled) throws SQLException {
        double restored = queryDouble(connection, """
                SELECT COALESCE(SUM(tc.amount), 0)
                FROM tontine_collection tc
                JOIN tontine_collection_reset_line l ON l.collection_id = tc.id AND l.run_id = 5
                WHERE tc.visibility = 'ENABLED'
                """);
        double cancelled = queryDouble(connection, """
                SELECT COALESCE(SUM(amount), 0)
                FROM tontine_collection
                WHERE id IN (41196, 41197, 41208)
                """);
        insertJournal(connection, "TONTINE_COLLECTION", restored,
                "Restauration archive 5",
                "Rétablissement des " + reenabled
                        + " collectes tontine de COM003 annulées par erreur (archive 5). "
                        + "Les collectes des autres commerciaux sont inchangées.");
        insertJournal(connection, "TONTINE_COLLECTION_CANCEL", -cancelled,
                "Annulation tests COM003",
                "Annulation des 3 collectes de test COM003 saisies après l'erreur (41196, 41197, 41208).");
    }

    private static void insertJournal(Connection connection, String type, double amount, String reference,
            String description) throws SQLException {
        String sql = """
                INSERT INTO daily_operation_log (
                    reg_user_id, date_reg, visibility, date, commercial_username, "timestamp",
                    type, amount, reference, description, reliquat_generated_amount, reliquat_used_amount
                ) VALUES (?, NOW(), 'ENABLED', CURRENT_DATE, ?, NOW(), ?, ?, ?, ?, 0, 0)
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, AUDIT_USER);
            statement.setString(2, COMMERCIAL);
            statement.setString(3, type);
            statement.setDouble(4, amount);
            statement.setString(5, reference);
            statement.setString(6, description);
            statement.executeUpdate();
        }
    }

    private static double queryDouble(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery(sql)) {
            rows.next();
            return rows.getDouble(1);
        }
    }

    private static void assertCount(Statement statement, String sql, int expected, String label) throws SQLException {
        try (ResultSet rows = statement.executeQuery(sql)) {
            rows.next();
            int actual = rows.getInt(1);
            if (actual != expected) {
                throw new SQLException(label + " : " + actual + " au lieu de " + expected + ".");
            }
        }
    }

    private static double safe(Double value) {
        return value != null ? value : 0;
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Variable " + name + " absente.");
        }
        return value;
    }

    private static final class MemberLines {
        private final TontineMember member;
        private final List<TontineCollection> lines = new ArrayList<>();

        private MemberLines(TontineMember member) {
            this.member = member;
        }
    }

    private static final class MemberUpdate {
        private final TontineMember member;

        private MemberUpdate(TontineMember member) {
            this.member = member;
        }
    }

    private static final class LineUpdate {
        private final TontineCollection line;

        private LineUpdate(TontineCollection line) {
            this.line = line;
        }
    }

    static final class Summary {
        private final long sessionId;
        private final int reenabled;
        private final int cancelled;
        private final int members;
        private final int com003LinesRecalculated;
        private final int otherLinesKept;
        private final int reports;

        private Summary(long sessionId, int reenabled, int cancelled, int members, int com003LinesRecalculated,
                int otherLinesKept, int reports) {
            this.sessionId = sessionId;
            this.reenabled = reenabled;
            this.cancelled = cancelled;
            this.members = members;
            this.com003LinesRecalculated = com003LinesRecalculated;
            this.otherLinesKept = otherLinesKept;
            this.reports = reports;
        }

        @Override
        public String toString() {
            return "session=" + sessionId
                    + " réactivées=" + reenabled
                    + " tests annulés=" + cancelled
                    + " membres=" + members
                    + " lignes COM003 recalculées=" + com003LinesRecalculated
                    + " autres lignes inchangées=" + otherLinesKept
                    + " rapports=" + reports;
        }
    }
}
