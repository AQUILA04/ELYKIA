package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.SaleCancellationFile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaleCancellationFileRepository extends GenericRepository<SaleCancellationFile, Long> {

    List<SaleCancellationFile> findByRun_IdOrderByIdAsc(Long runId);

    Optional<SaleCancellationFile> findByRun_IdAndCreditId(Long runId, Long creditId);
}
