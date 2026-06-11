package com.optimize.elykia.core.util;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreditArticleUnitPricePolicyTest {

    @Test
    void allowsUnitPriceWhileCreditIsDraft() {
        CreditArticles line = new CreditArticles();
        Credit credit = new Credit();
        credit.setStatus(CreditStatus.VALIDATED);
        line.setCredit(credit);

        assertDoesNotThrow(() -> line.setUnitPrice(1_500.0));
        assertEquals(1_500.0, line.getUnitPrice());
    }

    @Test
    void blocksUnitPriceChangeAfterInProgress() {
        CreditArticles line = new CreditArticles();
        line.setUnitPrice(1_000.0);

        Credit credit = new Credit();
        credit.setStatus(CreditStatus.INPROGRESS);
        line.setCredit(credit);

        assertThrows(CustomValidationException.class, () -> line.setUnitPrice(2_000.0));
        assertEquals(1_000.0, line.getUnitPrice());
    }

    @Test
    void allowsIdempotentUnitPriceWhenFrozen() {
        CreditArticles line = new CreditArticles();
        line.setUnitPrice(1_000.0);

        Credit credit = new Credit();
        credit.setStatus(CreditStatus.SETTLED);
        line.setCredit(credit);

        assertDoesNotThrow(() -> line.setUnitPrice(1_000.0));
    }

    @Test
    void frozenCreditDoesNotFallbackToCatalogPriceInTotalCalculation() {
        Articles article = new Articles();
        article.setCreditSalePrice(5_000.0);

        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        line.setQuantity(2);
        line.setUnitPrice(3_000.0);

        Credit credit = new Credit();
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setType(OperationType.CREDIT);
        credit.setArticles(Set.of(line));
        line.setCredit(credit);

        article.setCreditSalePrice(9_999.0);

        assertEquals(6_000.0, credit.getTotalAmountByCalcul());
        assertTrue(CreditArticleUnitPricePolicy.isUnitPriceFrozen(CreditStatus.INPROGRESS));
    }
}
