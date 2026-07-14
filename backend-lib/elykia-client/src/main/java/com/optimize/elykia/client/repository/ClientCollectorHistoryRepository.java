package com.optimize.elykia.client.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.entity.ClientCollectorHistory;

import java.util.List;

public interface ClientCollectorHistoryRepository extends GenericRepository<ClientCollectorHistory, Long> {

    List<ClientCollectorHistory> findByClientIdOrderByChangeDateDesc(Long clientId);
}
