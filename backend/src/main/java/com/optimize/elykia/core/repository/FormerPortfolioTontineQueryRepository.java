package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.dto.portfolio.FormerTontineCollectionDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineMemberDto;
import com.optimize.elykia.tontine.domain.TontineMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Read-only former-portfolio tontine projections kept in {@code core} (until Wave 7)
 * so {@code tontine} repositories have zero dependency on {@code core.dto.portfolio}.
 */
public interface FormerPortfolioTontineQueryRepository extends Repository<TontineMember, Long> {

    @Query(value = """
            SELECT new com.optimize.elykia.core.dto.portfolio.FormerTontineMemberDto(
                tm.id,
                s.year,
                c.id,
                c.code,
                c.firstname,
                c.lastname,
                c.phone,
                c.quarter,
                COALESCE((
                    SELECT SUM(tc.amount) FROM TontineCollection tc
                    WHERE tc.tontineMember = tm
                      AND tc.state = com.optimize.common.entities.enums.State.ENABLED
                      AND LOWER(tc.commercialUsername) = LOWER(:commercial)
                ), 0.0),
                (
                    SELECT COUNT(tc2.id) FROM TontineCollection tc2
                    WHERE tc2.tontineMember = tm
                      AND tc2.state = com.optimize.common.entities.enums.State.ENABLED
                      AND LOWER(tc2.commercialUsername) = LOWER(:commercial)
                )
            )
            FROM TontineMember tm
            JOIN tm.client c
            JOIN tm.tontineSession s
            WHERE tm.state = com.optimize.common.entities.enums.State.ENABLED
              AND (c.tontineCollector IS NULL OR LOWER(c.tontineCollector) <> LOWER(:commercial))
              AND (
                EXISTS (
                    SELECT 1 FROM TontineCollection tc3
                    WHERE tc3.tontineMember = tm
                      AND tc3.state = com.optimize.common.entities.enums.State.ENABLED
                      AND LOWER(tc3.commercialUsername) = LOWER(:commercial)
                )
                OR EXISTS (
                    SELECT 1 FROM com.optimize.elykia.client.entity.ClientCollectorHistory h
                    WHERE h.clientId = c.id
                      AND h.collectorType = com.optimize.elykia.client.enumeration.ClientCollectorType.TONTINE
                      AND h.state = com.optimize.common.entities.enums.State.ENABLED
                      AND h.oldCollector IS NOT NULL
                      AND LOWER(h.oldCollector) = LOWER(:commercial)
                )
              )
            ORDER BY c.lastname ASC, c.firstname ASC, s.year DESC, tm.id DESC
            """,
            countQuery = """
            SELECT COUNT(tm) FROM TontineMember tm
            JOIN tm.client c
            WHERE tm.state = com.optimize.common.entities.enums.State.ENABLED
              AND (c.tontineCollector IS NULL OR LOWER(c.tontineCollector) <> LOWER(:commercial))
              AND (
                EXISTS (
                    SELECT 1 FROM TontineCollection tc3
                    WHERE tc3.tontineMember = tm
                      AND tc3.state = com.optimize.common.entities.enums.State.ENABLED
                      AND LOWER(tc3.commercialUsername) = LOWER(:commercial)
                )
                OR EXISTS (
                    SELECT 1 FROM com.optimize.elykia.client.entity.ClientCollectorHistory h
                    WHERE h.clientId = c.id
                      AND h.collectorType = com.optimize.elykia.client.enumeration.ClientCollectorType.TONTINE
                      AND h.state = com.optimize.common.entities.enums.State.ENABLED
                      AND h.oldCollector IS NOT NULL
                      AND LOWER(h.oldCollector) = LOWER(:commercial)
                )
              )
            """)
    Page<FormerTontineMemberDto> findFormerMembers(
            @Param("commercial") String commercial,
            Pageable pageable);

    @Query("""
            SELECT new com.optimize.elykia.core.dto.portfolio.FormerTontineCollectionDto(
                tc.tontineMember.id, tc.id, tc.amount, tc.collectionDate, tc.reference)
            FROM TontineCollection tc
            WHERE tc.tontineMember.id = :memberId
              AND tc.state = com.optimize.common.entities.enums.State.ENABLED
              AND LOWER(tc.commercialUsername) = LOWER(:commercial)
            ORDER BY tc.collectionDate DESC, tc.id DESC
            """)
    List<FormerTontineCollectionDto> findOwnCollections(
            @Param("memberId") Long memberId,
            @Param("commercial") String commercial);

    @Query("""
            SELECT new com.optimize.elykia.core.dto.portfolio.FormerTontineCollectionDto(
                tc.tontineMember.id, tc.id, tc.amount, tc.collectionDate, tc.reference)
            FROM TontineCollection tc
            JOIN tc.tontineMember tm
            JOIN tm.client c
            WHERE tc.state = com.optimize.common.entities.enums.State.ENABLED
              AND tm.state = com.optimize.common.entities.enums.State.ENABLED
              AND LOWER(tc.commercialUsername) = LOWER(:commercial)
              AND (c.tontineCollector IS NULL OR LOWER(c.tontineCollector) <> LOWER(:commercial))
            ORDER BY tc.collectionDate DESC, tc.id DESC
            """)
    List<FormerTontineCollectionDto> findFormerOwnCollections(
            @Param("commercial") String commercial,
            Pageable pageable);
}
