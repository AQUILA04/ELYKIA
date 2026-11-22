package com.optimize.elykia.company.domain;

import java.util.Arrays;

/**
 * Immutable cached representation of the deployed enterprise logo binary asset.
 */
public record CompanyLogoAsset(
        byte[] data,
        String contentType,
        String filename,
        long themeVersion
) {
    public CompanyLogoAsset {
        data = data != null ? Arrays.copyOf(data, data.length) : new byte[0];
    }

    @Override
    public byte[] data() {
        return Arrays.copyOf(data, data.length);
    }

    public String etag() {
        return "\"company-logo-v" + themeVersion + "\"";
    }
}
