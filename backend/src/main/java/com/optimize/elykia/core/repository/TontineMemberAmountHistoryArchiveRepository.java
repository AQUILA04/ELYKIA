package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistoryArchive;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineMemberAmountHistoryArchiveRepository extends GenericRepository<TontineMemberAmountHistoryArchive, Long> {

    List<TontineMemberAmountHistoryArchive> findByTontineMember_IdOrderByArchivedAtDescStartDateAsc(Long tontineMemberId);

    List<TontineMemberAmountHistoryArchive> findByBatchIdOrderByStartDateAsc(String batchId);
}
