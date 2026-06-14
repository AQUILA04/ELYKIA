package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineCollectionResetFileRepository extends GenericRepository<TontineCollectionResetFile, Long> {

    List<TontineCollectionResetFile> findByRun_IdOrderByCommercialUsernameAscQuarterAsc(Long runId);
}
