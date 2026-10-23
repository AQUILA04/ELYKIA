package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import org.springframework.data.jpa.repository.EntityGraph;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TontineMemberFieldControlRepository extends GenericRepository<TontineMemberFieldControl, Long> {

    @EntityGraph(attributePaths = "lines")
    Optional<TontineMemberFieldControl> findFirstByTontineMember_idAndStateOrderByObservedAtDesc(
            Long tontineMemberId, State state);

    @EntityGraph(attributePaths = "lines")
    List<TontineMemberFieldControl> findByTontineMember_idAndStateOrderByObservedAtDesc(
            Long tontineMemberId, State state);

    boolean existsByReference(String reference);

    @EntityGraph(attributePaths = "lines")
    Optional<TontineMemberFieldControl> findByReference(String reference);

    @Query("""
            SELECT DISTINCT c FROM TontineMemberFieldControl c
            JOIN FETCH c.lines
            JOIN FETCH c.tontineMember m
            WHERE c.state = com.optimize.common.entities.enums.State.ENABLED
              AND m.id IN :memberIds
              AND c.observedAt = (
                SELECT MAX(c2.observedAt) FROM TontineMemberFieldControl c2
                WHERE c2.tontineMember.id = m.id
                  AND c2.state = com.optimize.common.entities.enums.State.ENABLED
              )
            """)
    List<TontineMemberFieldControl> findLatestByMemberIds(@Param("memberIds") Collection<Long> memberIds);

    @EntityGraph(attributePaths = {"lines", "tontineMember"})
    List<TontineMemberFieldControl> findByTontineMember_IdInAndObservedAtBetweenAndState(
            List<Long> memberIds,
            java.time.LocalDateTime start,
            java.time.LocalDateTime end,
            State state
    );

    @Query("""
            SELECT DISTINCT c FROM TontineMemberFieldControl c
            JOIN FETCH c.lines
            JOIN FETCH c.tontineMember m
            JOIN FETCH m.client
            WHERE c.state = com.optimize.common.entities.enums.State.ENABLED
              AND c.status = com.optimize.elykia.core.enumaration.FieldControlStatus.ECART
              AND c.observedAt = (
                SELECT MAX(c2.observedAt) FROM TontineMemberFieldControl c2
                WHERE c2.tontineMember.id = c.tontineMember.id
                  AND c2.state = com.optimize.common.entities.enums.State.ENABLED
              )
            """)
    List<TontineMemberFieldControl> findLatestEcarts();

    @Query(value = """
            SELECT COALESCE(SUM(l.notebook_amount), 0)
            FROM tontine_member_field_control_line l
            JOIN tontine_member_field_control c ON c.id = l.field_control_id
            JOIN tontine_member m ON m.id = c.tontine_member_id
            JOIN tontine_session s ON s.id = m.tontine_session_id
            WHERE c.visibility = 'ENABLED'
              AND s.year = :year
              AND LOWER(l.commercial_username) = LOWER(:commercial)
              AND c.id = (
                SELECT c2.id FROM tontine_member_field_control c2
                WHERE c2.tontine_member_id = c.tontine_member_id AND c2.visibility = 'ENABLED'
                ORDER BY c2.observed_at DESC, c2.id DESC
                LIMIT 1
              )
            """, nativeQuery = true)
    Double sumLatestNotebookForCollector(@Param("commercial") String commercial, @Param("year") int year);

    @Query(value = """
            SELECT COALESCE(SUM(l.difference_amount), 0)
            FROM tontine_member_field_control_line l
            JOIN tontine_member_field_control c ON c.id = l.field_control_id
            JOIN tontine_member m ON m.id = c.tontine_member_id
            JOIN tontine_session s ON s.id = m.tontine_session_id
            WHERE c.visibility = 'ENABLED'
              AND s.year = :year
              AND l.difference_amount > 0.5
              AND LOWER(l.commercial_username) = LOWER(:commercial)
              AND c.id = (
                SELECT c2.id FROM tontine_member_field_control c2
                WHERE c2.tontine_member_id = c.tontine_member_id AND c2.visibility = 'ENABLED'
                ORDER BY c2.observed_at DESC, c2.id DESC
                LIMIT 1
              )
              AND NOT EXISTS (
                SELECT 1 FROM carnet_ecart_decision d
                WHERE d.tontine_line_id = l.id
                  AND d.visibility = 'ENABLED'
                  AND d.status IN ('ACCEPTED', 'REJECTED')
              )
            """, nativeQuery = true)
    Double sumPendingPositiveDifferenceForCollector(@Param("commercial") String commercial, @Param("year") int year);
}
