package com.optimize.elykia.client.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.entity.ClientCollectorHistory;
import com.optimize.elykia.client.enumeration.ClientCollectorType;

import java.util.List;

public interface ClientCollectorHistoryRepository extends GenericRepository<ClientCollectorHistory, Long> {

    List<ClientCollectorHistory> findByClientIdOrderByChangeDateDesc(Long clientId);

    boolean existsByClientIdAndCollectorTypeAndOldCollectorIgnoreCaseAndState(
            Long clientId,
            ClientCollectorType collectorType,
            String oldCollector,
            State state);
}
