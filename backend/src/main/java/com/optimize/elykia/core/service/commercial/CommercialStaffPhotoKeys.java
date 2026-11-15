package com.optimize.elykia.core.service.commercial;

final class CommercialStaffPhotoKeys {

    private CommercialStaffPhotoKeys() {
    }

    static String original(Long id) {
        return "commercial-staff/" + id + "/profil/original.jpg";
    }

    static String thumb(Long id) {
        return "commercial-staff/" + id + "/profil/thumb.jpg";
    }
}
