package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.TontineMemberAmountHistoryRespDto;
import com.optimize.elykia.core.entity.TontineMemberAmountHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineMemberAmountHistoryRepository extends GenericRepository<TontineMemberAmountHistory, Long> {

    @Query("SELECT new com.optimize.elykia.core.dto.TontineMemberAmountHistoryRespDto(" +
           "h.id, " +
           "tm.id, " +
           "h.amount, " +
           "h.startDate, " +
           "h.creationDate) " +
           "FROM TontineMemberAmountHistory h " +
           "JOIN h.tontineMember tm " +
           "JOIN tm.tontineSession s " +
           "LEFT JOIN tm.client c " +
           "WHERE s.year = :year " +
           "AND (:commercial IS NULL OR c.tontineCollector = :commercial)")
    List<TontineMemberAmountHistoryRespDto> findHistoryDto(
            @Param("year") Integer year,
            @Param("commercial") String commercial);

    @Query("SELECT new com.optimize.elykia.core.dto.TontineMemberAmountHistoryRespDto(" +
           "h.id, " +
           "tm.id, " +
           "h.amount, " +
           "h.startDate, " +
           "h.creationDate) " +
           "FROM TontineMemberAmountHistory h " +
           "JOIN h.tontineMember tm " +
           "JOIN tm.tontineSession s " +
           "LEFT JOIN tm.client c " +
           "WHERE s.year = :year " +
           "AND (:commercial IS NULL OR c.tontineCollector = :commercial)")
    Page<TontineMemberAmountHistoryRespDto> findHistoryDtoPage(
            @Param("year") Integer year,
            @Param("commercial") String commercial,
            Pageable pageable);
}
