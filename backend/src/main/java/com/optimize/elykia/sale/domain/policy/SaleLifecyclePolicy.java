package com.optimize.elykia.sale.domain.policy;

import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;

import java.time.LocalDate;

/**
 * Politique comportementale exhaustive (Java 25 {@code sealed interface}) encodant les règles
 * de cycle de vie propres à chaque {@link SaleType} ({@code CREDIT}, {@code CASH}, {@code TONTINE}).
 */
public sealed interface SaleLifecyclePolicy permits CreditSalePolicy, CashSalePolicy, TontineSalePolicy {

    SaleType saleType();

    void initializeFinancialTerms(Credit credit);

    void validateBeforeStart(Credit credit);

    CreditStatus statusOnStart(Credit credit);

    default void configureStartSchedule(Credit credit, LocalDate startDate) {
        // Par défaut, aucun recalcul d'échéancier au démarrage (CASH / TONTINE).
    }

    double resolveFallbackUnitPrice(CreditArticles line);

    void assertDailyStakeChangeAllowed(Credit credit);

    void assertSoftDeleteAllowed(Credit credit);

    default void assertInProgressForRecovery(Credit credit) {
        // Par défaut, les recouvrements initiaux CASH / TONTINE n'exigent pas le statut INPROGRESS.
    }

    boolean publishesCreditStartedEvent();
}
