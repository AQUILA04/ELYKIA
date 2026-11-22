package com.optimize.elykia.sale.domain.policy;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;

import java.time.LocalDate;

/**
 * Règles de cycle de vie propres à une vente au comptant ({@link SaleType#CASH}).
 */
public final class CashSalePolicy implements SaleLifecyclePolicy {

    public static final CashSalePolicy INSTANCE = new CashSalePolicy();

    private CashSalePolicy() {
    }

    @Override
    public SaleType saleType() {
        return SaleType.CASH;
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
        credit.setTotalAmountPaid(credit.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        credit.setAdvance(0.0);
        credit.setRemainingDaysCount(0);
        credit.setExpectedEndDate(credit.getBeginDate());
    }

    @Override
    public void validateBeforeStart(Credit credit) {
        throw new CustomValidationException(
                "Une vente comptant se livre depuis la demande de sortie. Elle ne se démarre pas.");
    }

    @Override
    public CreditStatus statusOnStart(Credit credit) {
        return CreditStatus.SETTLED;
    }

    @Override
    public double resolveFallbackUnitPrice(CreditArticles line) {
        if (line == null || line.getArticles() == null) {
            return 0D;
        }
        double creditSalePrice = line.getArticles().getCreditSalePrice();
        if (creditSalePrice > 0) {
            return creditSalePrice;
        }
        double sellingPrice = line.getArticles().getSellingPrice();
        return sellingPrice > 0 ? sellingPrice : 0D;
    }

    @Override
    public void assertDailyStakeChangeAllowed(Credit credit) {
        throw new CustomValidationException("Une vente comptant n'a pas de mise journalière.");
    }

    @Override
    public void assertSoftDeleteAllowed(Credit credit) {
        throw new CustomValidationException(
                "Une vente comptant s'annule tant qu'elle n'est pas livrée. Elle ne se supprime pas.");
    }

    @Override
    public boolean publishesCreditStartedEvent() {
        return false;
    }
}
