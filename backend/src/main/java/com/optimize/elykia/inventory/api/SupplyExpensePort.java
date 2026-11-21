package com.optimize.elykia.inventory.api;

import java.time.LocalDate;

/**
 * Port SPI permettant au module {@code inventory} d'enregistrer une dépense
 * d'approvisionnement (ou son annulation) sans dépendre du module {@code finance}/{@code core}.
 */
public interface SupplyExpensePort {

    void recordSupplyExpense(double amount, LocalDate expenseDate, String description, String reference);
}
