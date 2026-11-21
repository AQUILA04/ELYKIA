package com.optimize.elykia.core.dto.report.cockpit;

import com.optimize.elykia.shared.domain.OperationType;

/**
 * Total d'un type d'opération sur une période (cartes du journal).
 *
 * @param type   type d'opération
 * @param count  nombre d'opérations
 * @param amount montant cumulé
 */
public record OperationTypeTotalDto(OperationType type, long count, double amount) {
}
