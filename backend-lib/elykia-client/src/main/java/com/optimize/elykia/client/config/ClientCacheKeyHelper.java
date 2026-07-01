package com.optimize.elykia.client.config;

import java.util.Objects;

public final class ClientCacheKeyHelper {

    private ClientCacheKeyHelper() {
    }

    public static String commercialFilterKey(String username) {
        return Objects.toString(resolveCommercialUsername(username), "");
    }

    public static String resolveCommercialUsername(String username) {
        if (username != null && username.startsWith("COM")) {
            return username;
        }
        return null;
    }
}
