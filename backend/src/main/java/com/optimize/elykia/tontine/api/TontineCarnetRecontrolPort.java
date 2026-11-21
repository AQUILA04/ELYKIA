package com.optimize.elykia.tontine.api;

import com.optimize.elykia.shared.carnet.EcartDecisionView;
import com.optimize.elykia.tontine.domain.TontineMemberFieldControl;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

/**
 * SPI port decoupling {@code tontine} field controls from {@code carnet} ecart recontrol policy.
 */
public interface TontineCarnetRecontrolPort {

    boolean mustModifyTontine(TontineMemberFieldControl latest);

    EcartDecisionView viewTontine(TontineMemberFieldControl control);

    Map<Long, EcartDecisionView> viewTontines(Collection<TontineMemberFieldControl> controls);

    Set<Long> terminalTontineLineIds(TontineMemberFieldControl control);
}
