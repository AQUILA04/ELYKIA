package com.optimize.elykia.core.service.portfolio;

import com.optimize.elykia.sale.api.FormerPortfolioCreditPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Thin core adapter bridging {@code sale} credit controller to {@link FormerPortfolioService}.
 */
@Component
@RequiredArgsConstructor
public class FormerPortfolioCreditPortAdapter implements FormerPortfolioCreditPort {

    private final FormerPortfolioService formerPortfolioService;

    @Override
    public AccessLevel decideCredit(Long creditId) {
        FormerPortfolioAccess.Level level = formerPortfolioService.decideCredit(creditId);
        return switch (level) {
            case FULL -> AccessLevel.FULL;
            case FORMER -> AccessLevel.FORMER;
            case DENIED -> AccessLevel.DENIED;
        };
    }

    @Override
    public void assertFullCredit(Long creditId) {
        formerPortfolioService.assertFullCredit(creditId);
    }

    @Override
    public Object getFormerCredit(Long creditId) {
        return formerPortfolioService.getFormerCredit(creditId);
    }

    @Override
    public Object ownCreditTimelines(Long creditId) {
        return formerPortfolioService.ownCreditTimelines(creditId);
    }

    @Override
    public String deniedMessage() {
        return FormerPortfolioService.DENIED;
    }
}
