package com.optimize.elykia.sale.api;

import com.optimize.elykia.sale.domain.CreditFieldControl;
import com.optimize.elykia.shared.carnet.EcartDecisionView;

import java.util.Collection;
import java.util.Map;

/**
 * SPI port decoupling {@code sale} credit field controls from carnet ecart recontrol decisions.
 */
public interface CreditCarnetRecontrolPort {

    boolean mustModifyCredit(CreditFieldControl latest);

    EcartDecisionView viewCredit(CreditFieldControl control);

    Map<Long, EcartDecisionView> viewCredits(Collection<CreditFieldControl> controls);
}
