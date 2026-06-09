package com.optimize.elykia.client.storage;

import org.springframework.stereotype.Component;

@Component
public class ReportObjectKeyBuilder {

    public String buildGeneralKey(int year, int month) {
        return String.format("reports/%d/%02d/general.pdf", year, month);
    }

    public String buildCommercialKey(int year, int month, String username) {
        return String.format("reports/%d/%02d/commercial-%s.pdf", year, month, username);
    }
}
