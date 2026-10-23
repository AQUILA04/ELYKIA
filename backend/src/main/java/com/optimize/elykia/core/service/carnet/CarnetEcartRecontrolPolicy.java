package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.carnet.CarnetEcartDecision;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.CarnetEcartDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Un écart encore ouvert se modifie. Un contrôle conforme, ou un écart déjà accepté
 * ou refusé, autorise un nouveau contrôle.
 */
@Component
@RequiredArgsConstructor
public class CarnetEcartRecontrolPolicy {

    private final CarnetEcartDecisionRepository decisionRepository;

    public record EcartDecisionView(CarnetEcartStatus status, boolean modifiable) {
        public static EcartDecisionView none() {
            return new EcartDecisionView(null, false);
        }
    }

    public boolean mustModifyCredit(CreditFieldControl latest) {
        return viewCredit(latest).modifiable();
    }

    public boolean mustModifyTontine(TontineMemberFieldControl latest) {
        return viewTontine(latest).modifiable();
    }

    public EcartDecisionView viewCredit(CreditFieldControl control) {
        if (control == null || control.getId() == null) {
            return EcartDecisionView.none();
        }
        CarnetEcartDecision decision = decisionRepository.findByCreditFieldControlId(control.getId())
                .filter(this::isEnabled)
                .orElse(null);
        return summarizeCredit(control.getStatus(), control.getDifferenceAmount(), decision);
    }

    public EcartDecisionView viewTontine(TontineMemberFieldControl control) {
        if (control == null || control.getId() == null) {
            return EcartDecisionView.none();
        }
        return viewTontines(List.of(control)).getOrDefault(control.getId(), EcartDecisionView.none());
    }

    public Map<Long, EcartDecisionView> viewCredits(Collection<CreditFieldControl> controls) {
        if (controls == null || controls.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = controls.stream()
                .map(CreditFieldControl::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, CarnetEcartDecision> byControl = new HashMap<>();
        if (!ids.isEmpty()) {
            for (CarnetEcartDecision decision : decisionRepository.findByCreditFieldControlIdIn(ids)) {
                if (decision.getCreditFieldControlId() != null && isEnabled(decision)) {
                    byControl.put(decision.getCreditFieldControlId(), decision);
                }
            }
        }
        Map<Long, EcartDecisionView> views = new HashMap<>();
        for (CreditFieldControl control : controls) {
            if (control.getId() == null) {
                continue;
            }
            views.put(control.getId(), summarizeCredit(
                    control.getStatus(),
                    control.getDifferenceAmount(),
                    byControl.get(control.getId())));
        }
        return views;
    }

    public Map<Long, EcartDecisionView> viewTontines(Collection<TontineMemberFieldControl> controls) {
        if (controls == null || controls.isEmpty()) {
            return Map.of();
        }
        List<Long> lineIds = controls.stream()
                .filter(control -> control.getLines() != null)
                .flatMap(control -> control.getLines().stream())
                .map(TontineMemberFieldControlLine::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, CarnetEcartStatus> byLine = new HashMap<>();
        if (!lineIds.isEmpty()) {
            for (CarnetEcartDecision decision : decisionRepository.findByTontineLineIdIn(lineIds)) {
                if (decision.getTontineLineId() != null && isEnabled(decision)) {
                    byLine.put(decision.getTontineLineId(), decision.getStatus());
                }
            }
        }
        Map<Long, EcartDecisionView> views = new HashMap<>();
        for (TontineMemberFieldControl control : controls) {
            if (control.getId() == null) {
                continue;
            }
            views.put(control.getId(), summarizeTontine(control.getStatus(), control.getLines(), byLine));
        }
        return views;
    }

    /**
     * Lignes d'écart déjà acceptées ou refusées : leurs montants ne sont pas réécrits.
     */
    public Set<Long> terminalTontineLineIds(TontineMemberFieldControl control) {
        if (control == null || control.getLines() == null || control.getLines().isEmpty()) {
            return Set.of();
        }
        List<Long> lineIds = control.getLines().stream()
                .map(TontineMemberFieldControlLine::getId)
                .filter(Objects::nonNull)
                .toList();
        if (lineIds.isEmpty()) {
            return Set.of();
        }
        Set<Long> terminal = new HashSet<>();
        for (CarnetEcartDecision decision : decisionRepository.findByTontineLineIdIn(lineIds)) {
            if (decision.getTontineLineId() != null
                    && isEnabled(decision)
                    && isTerminal(decision.getStatus())) {
                terminal.add(decision.getTontineLineId());
            }
        }
        return terminal;
    }

    public static EcartDecisionView summarizeCredit(
            FieldControlStatus status,
            Double difference,
            CarnetEcartDecision decision) {
        if (status != FieldControlStatus.ECART) {
            return EcartDecisionView.none();
        }
        double amount = difference != null ? difference : 0d;
        if (!CarnetEcartRules.isMaterial(amount)) {
            return EcartDecisionView.none();
        }
        if (decision == null || decision.getStatus() == null || decision.getStatus() == CarnetEcartStatus.PENDING) {
            return new EcartDecisionView(CarnetEcartStatus.PENDING, true);
        }
        return new EcartDecisionView(decision.getStatus(), false);
    }

    public static EcartDecisionView summarizeTontine(
            FieldControlStatus status,
            List<TontineMemberFieldControlLine> lines,
            Map<Long, CarnetEcartStatus> decisionByLineId) {
        if (status != FieldControlStatus.ECART) {
            return EcartDecisionView.none();
        }
        boolean anyMaterial = false;
        boolean anyPending = false;
        boolean anyAccepted = false;
        boolean anyRejected = false;
        Map<Long, CarnetEcartStatus> decisions = decisionByLineId != null ? decisionByLineId : Map.of();
        if (lines != null) {
            for (TontineMemberFieldControlLine line : lines) {
                double difference = line.getDifferenceAmount() != null ? line.getDifferenceAmount() : 0d;
                if (!CarnetEcartRules.isMaterial(difference)) {
                    continue;
                }
                anyMaterial = true;
                CarnetEcartStatus lineStatus = line.getId() != null ? decisions.get(line.getId()) : null;
                if (lineStatus == CarnetEcartStatus.ACCEPTED) {
                    anyAccepted = true;
                } else if (lineStatus == CarnetEcartStatus.REJECTED) {
                    anyRejected = true;
                } else {
                    anyPending = true;
                }
            }
        }
        if (!anyMaterial) {
            return EcartDecisionView.none();
        }
        if (anyPending) {
            return new EcartDecisionView(CarnetEcartStatus.PENDING, true);
        }
        if (anyAccepted) {
            return new EcartDecisionView(CarnetEcartStatus.ACCEPTED, false);
        }
        if (anyRejected) {
            return new EcartDecisionView(CarnetEcartStatus.REJECTED, false);
        }
        return new EcartDecisionView(CarnetEcartStatus.PENDING, true);
    }

    private boolean isEnabled(CarnetEcartDecision decision) {
        return decision != null && decision.getState() == State.ENABLED;
    }

    private static boolean isTerminal(CarnetEcartStatus status) {
        return status == CarnetEcartStatus.ACCEPTED || status == CarnetEcartStatus.REJECTED;
    }
}
