package com.optimize.elykia.customer.infrastructure.persistence;

import com.optimize.elykia.customer.domain.CommercialMobileMoneyConfig;
import com.optimize.common.entities.repository.GenericRepository;

import java.util.Optional;

public interface CommercialMobileMoneyConfigRepository extends GenericRepository<CommercialMobileMoneyConfig, Long> {

    Optional<CommercialMobileMoneyConfig> findByCommercialUsername(String commercialUsername);
}
