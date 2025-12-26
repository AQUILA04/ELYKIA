package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.Recovery;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecoveryRepository extends GenericRepository<Recovery, Long> {

    List<Recovery> findByCommercialIdAndState(String commercialId, State state);
}
