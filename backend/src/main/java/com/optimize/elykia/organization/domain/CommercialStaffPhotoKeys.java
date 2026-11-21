package com.optimize.elykia.organization.domain;

public final class CommercialStaffPhotoKeys {

    private CommercialStaffPhotoKeys() {
    }

    public static String original(Long id) {
        return "commercial-staff/" + id + "/profil/original.jpg";
    }

    public static String thumb(Long id) {
        return "commercial-staff/" + id + "/profil/thumb.jpg";
    }
}
