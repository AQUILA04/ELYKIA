package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;

import java.util.List;
import java.util.Optional;

public interface CreditFieldControlRepository extends GenericRepository<CreditFieldControl, Long> {
    Optional<CreditFieldControl> findFirstByCredit_idAndStateOrderByObservedAtDesc(Long creditId, State state);

    List<CreditFieldControl> findByCredit_idAndStateOrderByObservedAtDesc(Long creditId, State state);
}
