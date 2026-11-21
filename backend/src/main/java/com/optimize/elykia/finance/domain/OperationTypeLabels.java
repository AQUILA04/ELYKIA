package com.optimize.elykia.finance.domain;

import com.optimize.elykia.shared.domain.OperationType;

import java.util.EnumMap;
import java.util.Map;

/**
 * Libellés français et familles des types d'opération du journal.
 * Mêmes libellés que l'écran Journal (frontend {@code operation-types.ts}).
 */
public final class OperationTypeLabels {

    private static final Map<OperationType, String> LABELS = new EnumMap<>(OperationType.class);
    private static final Map<OperationType, String> PILLS = new EnumMap<>(OperationType.class);

    static {
        put(OperationType.CREDIT_COLLECTION, "Recouvrement", "pill-navy");
        put(OperationType.CREDIT_COLLECTION_CANCEL, "Recouvrement annulé", "pill-red");
        put(OperationType.CREDIT_SALES, "Vente à crédit", "pill-navy");
        put(OperationType.CREDIT_SALE_CANCEL, "Vente annulée", "pill-red");
        put(OperationType.CREDIT, "Crédit", "pill-navy");
        put(OperationType.ORDER, "Commande", "pill-navy");
        put(OperationType.TONTINE_COLLECTION, "Collecte tontine", "pill-navy");
        put(OperationType.TONTINE_COLLECTION_CANCEL, "Collecte annulée", "pill-red");
        put(OperationType.TONTINE_DELIVERY, "Livraison tontine", "pill-navy");
        put(OperationType.TONTINE_MEMBER_ENROLLMENT, "Adhésion tontine", "pill-navy");
        put(OperationType.TONTINE, "Tontine", "pill-navy");
        put(OperationType.CASH_DEPOSIT, "Versement", "pill-green");
        put(OperationType.CASH_DEPOSIT_CANCEL, "Versement annulé", "pill-red");
        put(OperationType.CASH, "Caisse", "pill-green");
        put(OperationType.SURPLUS_REALLOCATION, "Équilibrage surplus", "pill-green");
        put(OperationType.NEW_ACCOUNT, "Nouveau compte", "pill-amber");
        put(OperationType.NEW_CLIENT, "Nouveau client", "pill-amber");
        put(OperationType.ADHESION_PERSONAL, "Adhésion personnelle", "pill-amber");
        put(OperationType.ADHESION_BUSINESS, "Adhésion business", "pill-amber");
        put(OperationType.ADHESION_EVENT, "Adhésion événement", "pill-amber");
        put(OperationType.ADHESION_TOP_UP, "Recharge d'adhésion", "pill-amber");
        put(OperationType.STOCK_REQUEST, "Sortie stock", "pill-grey");
        put(OperationType.STOCK_RETURN, "Retour stock", "pill-grey");
        put(OperationType.STOCK_TONTINE_REQUEST, "Sortie stock tontine", "pill-grey");
        put(OperationType.STOCK_TONTINE_RETURN, "Retour stock tontine", "pill-grey");
    }

    private OperationTypeLabels() {
    }

    private static void put(OperationType type, String label, String pill) {
        LABELS.put(type, label);
        PILLS.put(type, pill);
    }

    public static String label(OperationType type) {
        if (type == null) {
            return "";
        }
        return LABELS.getOrDefault(type, type.name());
    }

    /** Classe CSS de pastille du PDF (pill-navy, pill-green…). */
    public static String pill(OperationType type) {
        return type == null ? "pill-grey" : PILLS.getOrDefault(type, "pill-grey");
    }
}
