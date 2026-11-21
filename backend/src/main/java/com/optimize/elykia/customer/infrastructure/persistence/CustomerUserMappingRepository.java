package com.optimize.elykia.customer.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.customer.domain.CustomerUserMapping;

import java.util.Optional;

public interface CustomerUserMappingRepository extends GenericRepository<CustomerUserMapping, Long> {

    Optional<CustomerUserMapping> findByUsername(String username);

    Optional<CustomerUserMapping> findByClientId(Long clientId);

    boolean existsByUsername(String username);

    boolean existsByClientId(Long clientId);
}
