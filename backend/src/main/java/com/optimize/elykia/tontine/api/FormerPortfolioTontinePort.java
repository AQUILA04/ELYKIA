package com.optimize.elykia.tontine.api;

/**
 * SPI port decoupling {@code tontine} controller from former-portfolio access control.
 */
public interface FormerPortfolioTontinePort {

    enum AccessLevel {
        FULL,
        FORMER,
        DENIED
    }

    AccessLevel decideTontineMember(Long memberId);

    void assertFullTontineMember(Long memberId);

    Object getFormerTontineMember(Long memberId);

    Object ownTontineCollections(Long memberId);

    String deniedMessage();
}
