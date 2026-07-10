package com.optimize.elykia.core.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.customer.mobile-money")
@Getter
@Setter
public class CustomerMobileMoneyProperties {
    /** Numéro Mixx by YAS (ex-Tmoney) par défaut pour toute la société. */
    private String mixxNumber = "";
    /** Numéro Moov Money (ex-Flooz) par défaut pour toute la société. */
    private String moovNumber = "";
}
