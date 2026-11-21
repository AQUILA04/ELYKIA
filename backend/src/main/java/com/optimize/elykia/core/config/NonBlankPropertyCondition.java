package com.optimize.elykia.core.config;

import ch.qos.logback.core.boolex.PropertyConditionBase;

/**
 * Condition Logback 1.6 native (sans Janino) vérifiant qu'une propriété Logback
 * est définie et non vide (ex. {@code LOKI_API_KEY}).
 */
public class NonBlankPropertyCondition extends PropertyConditionBase {

    private String key;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    @Override
    public void start() {
        if (key == null || key.isBlank()) {
            addError("The 'key' property must be set for NonBlankPropertyCondition");
            return;
        }
        super.start();
    }

    @Override
    public boolean evaluate() {
        if (!isStarted()) {
            return false;
        }
        String value = getLocalPropertyContainer() != null
                ? p(key)
                : (getContext() != null ? getContext().getProperty(key) : null);
        return value != null && !value.trim().isEmpty();
    }
}
