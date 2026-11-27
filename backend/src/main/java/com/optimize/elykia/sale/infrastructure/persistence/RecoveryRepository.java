package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.Recovery;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * @deprecated Silo historique non raccordé au moteur de recouvrement unifié.
 */
@Deprecated(since = "2.17.0", forRemoval = true)
@Repository
public interface RecoveryRepository extends GenericRepository<Recovery, Long> {

    List<Recovery> findByCommercialIdAndState(String commercialId, State state);
}
