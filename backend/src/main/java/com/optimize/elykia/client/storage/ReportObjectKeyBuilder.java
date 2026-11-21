package com.optimize.elykia.client.storage;

import org.springframework.stereotype.Component;

@Component
public class ReportObjectKeyBuilder {

    public String buildGeneralKey(int year, int month) {
        return String.format("reports/%d/%02d/%s", year, month, buildGeneralFileName(year, month));
    }

    public String buildCommercialKey(int year, int month, String username) {
        return String.format("reports/%d/%02d/%s", year, month, buildCommercialFileName(year, month, username));
    }

    public String buildGeneralFileName(int year, int month) {
        return String.format("general-%02d-%d.pdf", month, year);
    }

    public String buildCommercialFileName(int year, int month, String username) {
        return String.format("commercial-%s-%02d-%d.pdf", username, month, year);
    }
}
