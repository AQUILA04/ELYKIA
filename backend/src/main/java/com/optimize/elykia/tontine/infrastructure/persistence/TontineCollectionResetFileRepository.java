package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineCollectionResetFile;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineCollectionResetFileRepository extends GenericRepository<TontineCollectionResetFile, Long> {

    List<TontineCollectionResetFile> findByRun_IdOrderByCommercialUsernameAscQuarterAsc(Long runId);
}
