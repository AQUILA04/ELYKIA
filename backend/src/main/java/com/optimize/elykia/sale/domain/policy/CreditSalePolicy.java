package com.optimize.elykia.sale.domain.policy;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;
import com.optimize.elykia.shared.util.MoneyUtil;

import java.time.LocalDate;

/**
 * Règles de cycle de vie propres à une vente à crédit ({@link SaleType#CREDIT}).
 */
public final class CreditSalePolicy implements SaleLifecyclePolicy {

    public static final CreditSalePolicy INSTANCE = new CreditSalePolicy();

    private CreditSalePolicy() {
    }

    @Override
    public SaleType saleType() {
        return SaleType.CREDIT;
    }

    @Override
    public void initializeFinancialTerms(Credit credit) {
        if (credit.isMobileFinancialTermsLocked()) {
            if (credit.getBeginDate() == null) {
                credit.setBeginDate(LocalDate.now());
            }
            return;
        }
        CreditStatus status = credit.getStatus();
        if (status != CreditStatus.CREATED && status != CreditStatus.VALIDATED) {
            return;
        }
        if (credit.getBeginDate() == null) {
            credit.setBeginDate(LocalDate.now());
        }

        double advance = (credit.getAdvance() != null && credit.getAdvance() > 0) ? credit.getAdvance() : 0.0;
        credit.setAdvance(advance);

        double remaining = credit.getTotalAmount() - advance;
        credit.setTotalAmountRemaining(remaining);
        credit.setTotalAmountPaid(advance);

        double rawDailyStake = remaining / 30;
        double dailyStake = MoneyUtil.calculateDailyStake(rawDailyStake);
        credit.setDailyStake(dailyStake);

        double exactDays = remaining / dailyStake;
        int remainingDays = (int) Math.ceil(exactDays);
        credit.setRemainingDaysCount(remainingDays);
        credit.setExpectedEndDate(credit.getBeginDate().plusDays(remainingDays));
    }

    @Override
    public void validateBeforeStart(Credit credit) {
        if (!CreditStatus.VALIDATED.equals(credit.getStatus())) {
            throw new ApplicationException("Le statut du credit est invalide pour le démarré");
        }
    }

    @Override
    public CreditStatus statusOnStart(Credit credit) {
        return CreditStatus.INPROGRESS;
    }

    @Override
    public void configureStartSchedule(Credit credit, LocalDate startDate) {
        if (credit.isMobileFinancialTermsLocked()) {
            if (credit.getBeginDate() == null) {
                credit.setBeginDate(startDate);
            }
            if (credit.getExpectedEndDate() == null && credit.getRemainingDaysCount() != null) {
                credit.setExpectedEndDate(credit.getBeginDate().plusDays(credit.getRemainingDaysCount()));
            }
            return;
        }
        credit.setBeginDate(startDate);
        int daysRemaining = credit.getRemainingDaysCount() != null ? credit.getRemainingDaysCount() : 30;
        credit.setRemainingDaysCount(daysRemaining);
        if (credit.getExpectedEndDate() == null) {
            credit.setExpectedEndDate(credit.getBeginDate().plusDays(daysRemaining));
        }
    }

    @Override
    public double resolveFallbackUnitPrice(CreditArticles line) {
        if (line == null || line.getArticles() == null) {
            return 0D;
        }
        double creditSalePrice = line.getArticles().getCreditSalePrice();
        return creditSalePrice > 0 ? creditSalePrice : 0D;
    }

    @Override
    public void assertDailyStakeChangeAllowed(Credit credit) {
        // Autorisé pour une vente à crédit (les contrôles de statut/montant restent dans Credit.changeDailyStake).
    }

    @Override
    public void assertSoftDeleteAllowed(Credit credit) {
        // La suppression douce reste autorisée pour les crédits.
    }

    @Override
    public void assertInProgressForRecovery(Credit credit) {
        if (!CreditStatus.INPROGRESS.equals(credit.getStatus())) {
            throw new ApplicationException("Le statut de la vente doit être encours pour faire une mise journalière !");
        }
    }

    @Override
    public boolean publishesCreditStartedEvent() {
        return true;
    }
}
