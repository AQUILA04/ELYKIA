package com.optimize.elykia.bootstrap.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.bootstrap.domain.MobileTransaction;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MobileTransactionRepository extends GenericRepository<MobileTransaction, Long> {

    List<MobileTransaction> findByCommercialIdAndState(String commercialId, State state);
}
