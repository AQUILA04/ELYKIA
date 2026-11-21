package com.optimize.common.entities.config;

import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.util.StringUtils;

import java.util.Locale;

public class CustomMessageSource extends ReloadableResourceBundleMessageSource {

    private final Locale locale = LocaleContextHolder.getLocale();

    public String getMessage(String key) {
        return StringUtils.hasText(key) ? this.getMessage(key.trim(), null, this.locale) : "";
    }
}
