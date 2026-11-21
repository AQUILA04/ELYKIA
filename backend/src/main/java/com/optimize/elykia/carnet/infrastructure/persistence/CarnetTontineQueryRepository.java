package com.optimize.elykia.carnet.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.carnet.web.dto.RmFieldTontineRowDto;
import com.optimize.elykia.shared.carnet.RmFieldListProgressSql;
import com.optimize.elykia.tontine.domain.TontineMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Read-only recovery-manager field projection queries over {@link TontineMember}, keeping
 * {@code tontine.infrastructure.persistence.TontineMemberRepository} free of {@code carnet} DTOs.
 */
public interface CarnetTontineQueryRepository extends Repository<TontineMember, Long> {

    default Page<RmFieldTontineRowDto> pageFieldRows(
            Integer year,
            State state,
            String searchPattern,
            String digitsPattern,
            String progress,
            Pageable pageable) {
        return pageFieldRowsQuery(
                year,
                state,
                searchPattern == null ? "" : searchPattern,
                digitsPattern == null ? "" : digitsPattern,
                progress,
                pageable);
    }

    @Query(value = """
            SELECT new com.optimize.elykia.carnet.web.dto.RmFieldTontineRowDto(
                tm.id,
                c.id,
                trim(concat(coalesce(c.firstname, ''), ' ', coalesce(c.lastname, ''))),
                c.phone,
                c.quarter,
                c.tontineCollector,
                s.year,
                tm.amount,
                tm.totalContribution,
                tm.carnetVerified
            )
            FROM TontineMember tm
            JOIN tm.tontineSession s
            JOIN tm.client c
            WHERE s.year = :year
              AND tm.state = :state
              AND (
                :searchPattern = ''
                OR cast(function('translate', lower(concat(coalesce(c.firstname, ''), ' ', coalesce(c.lastname, ''))),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') as string) LIKE cast(:searchPattern as string)
                OR cast(function('translate', lower(coalesce(c.quarter, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') as string) LIKE cast(:searchPattern as string)
                OR cast(function('translate', lower(coalesce(c.tontineCollector, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') as string) LIKE cast(:searchPattern as string)
                OR lower(coalesce(c.phone, '')) LIKE cast(:searchPattern as string)
                OR (:digitsPattern <> '' AND lower(cast(function('replace', coalesce(c.phone, ''), ' ', '') as string)) LIKE cast(:digitsPattern as string))
              )
            """ + RmFieldListProgressSql.TONTINE_JPQL + """
            ORDER BY c.lastname ASC, c.firstname ASC, tm.id ASC
            """,
            countQuery = """
            SELECT COUNT(tm.id)
            FROM TontineMember tm
            JOIN tm.tontineSession s
            JOIN tm.client c
            WHERE s.year = :year
              AND tm.state = :state
              AND (
                :searchPattern = ''
                OR cast(function('translate', lower(concat(coalesce(c.firstname, ''), ' ', coalesce(c.lastname, ''))),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') as string) LIKE cast(:searchPattern as string)
                OR cast(function('translate', lower(coalesce(c.quarter, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') as string) LIKE cast(:searchPattern as string)
                OR cast(function('translate', lower(coalesce(c.tontineCollector, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') as string) LIKE cast(:searchPattern as string)
                OR lower(coalesce(c.phone, '')) LIKE cast(:searchPattern as string)
                OR (:digitsPattern <> '' AND lower(cast(function('replace', coalesce(c.phone, ''), ' ', '') as string)) LIKE cast(:digitsPattern as string))
              )
            """ + RmFieldListProgressSql.TONTINE_JPQL)
    Page<RmFieldTontineRowDto> pageFieldRowsQuery(
            @Param("year") Integer year,
            @Param("state") State state,
            @Param("searchPattern") String searchPattern,
            @Param("digitsPattern") String digitsPattern,
            @Param("progress") String progress,
            Pageable pageable);
}
