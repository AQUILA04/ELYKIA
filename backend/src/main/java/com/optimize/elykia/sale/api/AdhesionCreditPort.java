package com.optimize.elykia.sale.api;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.sale.domain.CreditPurpose;

/**
 * SPI port decoupling {@code sale} from adhesion credit ceiling / authorization checks.
 */
public interface AdhesionCreditPort {

    void assertCreditAllowed(Client client, CreditPurpose purpose, Double totalAmount);

    boolean isDualCreditAuthorizationEnabled();
}
