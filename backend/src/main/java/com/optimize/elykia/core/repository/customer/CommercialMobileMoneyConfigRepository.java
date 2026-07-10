package com.optimize.elykia.core.repository.customer;

import com.optimize.elykia.core.entity.customer.CommercialMobileMoneyConfig;
import com.optimize.common.entities.repository.GenericRepository;

import java.util.Optional;

public interface CommercialMobileMoneyConfigRepository extends GenericRepository<CommercialMobileMoneyConfig, Long> {

    Optional<CommercialMobileMoneyConfig> findByCommercialUsername(String commercialUsername);
}
