package com.optimize.elykia.sale.application;

import com.optimize.elykia.client.enumeration.ClientType;
import org.apache.commons.lang3.RandomStringUtils;

import java.time.LocalDate;

/**
 * Générateur de référence métier pour les ventes ({@code CREDIT}, {@code CASH}, {@code TONTINE}).
 */
public final class SaleReferenceGenerator {

    private SaleReferenceGenerator() {
    }

    public static String generate(String clientId, ClientType clientType) {
        String yy = String.valueOf(LocalDate.now().getYear());
        String initial = clientType.name().substring(0, 1);
        return initial + yy.substring(2) + clientId + RandomStringUtils.secure().nextNumeric(4);
    }
}
