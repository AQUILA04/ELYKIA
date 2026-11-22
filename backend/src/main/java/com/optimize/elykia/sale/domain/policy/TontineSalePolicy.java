package com.optimize.elykia.sale.domain.policy;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;

import java.time.LocalDate;

/**
 * Règles de cycle de vie propres à une vente issue d'une livraison tontine ({@link SaleType#TONTINE}).
 */
public final class TontineSalePolicy implements SaleLifecyclePolicy {

    public static final TontineSalePolicy INSTANCE = new TontineSalePolicy();

    private TontineSalePolicy() {
    }

    @Override
    public SaleType saleType() {
        return SaleType.TONTINE;
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
        credit.setAdvance(0.0);
        credit.setTotalAmountPaid(credit.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        credit.setDailyStake(credit.getTotalAmount());
        credit.setRemainingDaysCount(0);
        credit.setExpectedEndDate(credit.getBeginDate());
    }

    @Override
    public void validateBeforeStart(Credit credit) {
        // Une livraison tontine est directement clôturée ou activée lors de la création du crédit tontine.
    }

    @Override
    public CreditStatus statusOnStart(Credit credit) {
        return ClientType.PROMOTER.equals(credit.getClientType())
                ? CreditStatus.INPROGRESS
                : CreditStatus.SETTLED;
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
        throw new CustomValidationException("Une vente tontine n'a pas de mise journalière.");
    }

    @Override
    public void assertSoftDeleteAllowed(Credit credit) {
        // La suppression douce reste permise sur une vente tontine.
    }

    @Override
    public boolean publishesCreditStartedEvent() {
        return false;
    }
}
