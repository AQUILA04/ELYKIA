package com.optimize.elykia.sale.domain;

import com.optimize.elykia.shared.domain.OperationType;

import java.util.Optional;

/**
 * Discriminateur métier typé des ventes portées par l'entité {@link Credit} (table {@code credit}).
 * Remplace progressivement les valeurs {@code CREDIT}, {@code CASH} et {@code TONTINE} de
 * {@link OperationType}, qui mélange types de vente et types d'écritures comptables.
 */
public enum SaleType {
    CREDIT(OperationType.CREDIT),
    CASH(OperationType.CASH),
    TONTINE(OperationType.TONTINE);

    private final OperationType operationType;

    SaleType(OperationType operationType) {
        this.operationType = operationType;
    }

    public OperationType toOperationType() {
        return operationType;
    }

    public static SaleType fromOperationType(OperationType operationType) {
        if (operationType == null) {
            throw new IllegalArgumentException("OperationType cannot be null when resolving SaleType");
        }
        return switch (operationType) {
            case CREDIT -> CREDIT;
            case CASH -> CASH;
            case TONTINE -> TONTINE;
            default -> throw new IllegalArgumentException(
                    "OperationType " + operationType + " is not a sale type (expected CREDIT, CASH or TONTINE)");
        };
    }

    public static Optional<SaleType> fromOperationTypeOptional(OperationType operationType) {
        if (operationType == null) {
            return Optional.empty();
        }
        return switch (operationType) {
            case CREDIT -> Optional.of(CREDIT);
            case CASH -> Optional.of(CASH);
            case TONTINE -> Optional.of(TONTINE);
            default -> Optional.empty();
        };
    }

    public static SaleType fromOperationTypeOrDefault(OperationType operationType, SaleType defaultValue) {
        return fromOperationTypeOptional(operationType).orElse(defaultValue);
    }

    public static boolean isSaleOperationType(OperationType operationType) {
        return fromOperationTypeOptional(operationType).isPresent();
    }
}
