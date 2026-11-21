package com.optimize.elykia.sale.api;

/**
 * SPI port decoupling {@code sale} credit controller from former-portfolio access control.
 */
public interface FormerPortfolioCreditPort {

    enum AccessLevel {
        FULL,
        FORMER,
        DENIED
    }

    AccessLevel decideCredit(Long creditId);

    void assertFullCredit(Long creditId);

    Object getFormerCredit(Long creditId);

    Object ownCreditTimelines(Long creditId);

    String deniedMessage();
}
