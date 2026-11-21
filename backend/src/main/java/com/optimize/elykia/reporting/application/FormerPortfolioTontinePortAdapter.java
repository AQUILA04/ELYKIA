package com.optimize.elykia.reporting.application;

import com.optimize.elykia.reporting.domain.FormerPortfolioAccess;
import com.optimize.elykia.tontine.api.FormerPortfolioTontinePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Thin core adapter bridging {@code tontine} controller to {@link FormerPortfolioService}.
 */
@Component
@RequiredArgsConstructor
public class FormerPortfolioTontinePortAdapter implements FormerPortfolioTontinePort {

    private final FormerPortfolioService formerPortfolioService;

    @Override
    public AccessLevel decideTontineMember(Long memberId) {
        FormerPortfolioAccess.Level level = formerPortfolioService.decideTontineMember(memberId);
        return switch (level) {
            case FULL -> AccessLevel.FULL;
            case FORMER -> AccessLevel.FORMER;
            case DENIED -> AccessLevel.DENIED;
        };
    }

    @Override
    public void assertFullTontineMember(Long memberId) {
        formerPortfolioService.assertFullTontineMember(memberId);
    }

    @Override
    public Object getFormerTontineMember(Long memberId) {
        return formerPortfolioService.getFormerTontineMember(memberId);
    }

    @Override
    public Object ownTontineCollections(Long memberId) {
        return formerPortfolioService.ownTontineCollections(memberId);
    }

    @Override
    public String deniedMessage() {
        return FormerPortfolioService.DENIED;
    }
}
