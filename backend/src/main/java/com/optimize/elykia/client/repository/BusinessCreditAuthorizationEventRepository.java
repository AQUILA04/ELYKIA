package com.optimize.elykia.client.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.entity.BusinessCreditAuthorizationEvent;

import java.util.List;

public interface BusinessCreditAuthorizationEventRepository
        extends GenericRepository<BusinessCreditAuthorizationEvent, Long> {

    List<BusinessCreditAuthorizationEvent> findByClientIdOrderByPerformedAtDesc(Long clientId);
}
