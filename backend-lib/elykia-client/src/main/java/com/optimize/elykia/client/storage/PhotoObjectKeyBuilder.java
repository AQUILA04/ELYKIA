package com.optimize.elykia.client.storage;

public class PhotoObjectKeyBuilder {

    private static final String PROFIL_ORIGINAL = "clients/%d/profil/original.jpg";
    private static final String PROFIL_THUMB = "clients/%d/profil/thumb.jpg";
    private static final String CARD_ORIGINAL = "clients/%d/card/original.jpg";
    private static final String CARD_THUMB = "clients/%d/card/thumb.jpg";

    public static String profilOriginal(Long clientId) {
        return PROFIL_ORIGINAL.formatted(clientId);
    }

    public static String profilThumb(Long clientId) {
        return PROFIL_THUMB.formatted(clientId);
    }

    public static String cardOriginal(Long clientId) {
        return CARD_ORIGINAL.formatted(clientId);
    }

    public static String cardThumb(Long clientId) {
        return CARD_THUMB.formatted(clientId);
    }
}
