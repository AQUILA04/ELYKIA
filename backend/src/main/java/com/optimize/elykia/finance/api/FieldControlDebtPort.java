package com.optimize.elykia.finance.api;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Port SPI permettant aux services de versement et de réallocation d'excédent du module {@code finance}
 * de coordonner l'imputation des manquants contrôle terrain sans dépendre directement de {@code debt}/{@code core}.
 */
public interface FieldControlDebtPort {

    void imputeFieldControlFromDeposit(
            String commercialUsername,
            LocalDate day,
            double creditAmount,
            double tontineAmount,
            String depositReference);

    void reverseFieldControlImputation(String depositReference);

    List<Object[]> findActiveCashDaysBefore(Collection<String> usernames, LocalDate before);

    List<LocalDate> findActiveCashDaysUpTo(String commercialUsername, LocalDate upTo);
}
