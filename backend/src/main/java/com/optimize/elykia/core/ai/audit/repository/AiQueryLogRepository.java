package com.optimize.elykia.core.ai.audit.repository;

import com.optimize.elykia.core.ai.audit.entity.AiQueryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AiQueryLogRepository extends JpaRepository<AiQueryLog, UUID> {

    List<AiQueryLog> findTop50ByStatusInAndCreatedAtAfterOrderByCreatedAtDesc(
            List<String> statuses, LocalDateTime since);

    @Query(value = """
            SELECT question, COUNT(*) AS cnt
            FROM ai_query_log
            WHERE created_at >= :since AND status = 'SUCCESS'
            GROUP BY question
            ORDER BY cnt DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findFrequentQuestions(@Param("since") LocalDateTime since, @Param("limit") int limit);

    @Query("""
            SELECT q.intent, COUNT(q)
            FROM AiQueryLog q
            WHERE q.createdAt >= :since
            GROUP BY q.intent
            """)
    List<Object[]> countByIntentSince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT AVG(q.durationMs)
            FROM AiQueryLog q
            WHERE q.createdAt >= :since AND q.intent = 'DATA' AND q.durationMs IS NOT NULL
            """)
    Double averageDataLatencySince(@Param("since") LocalDateTime since);
}
