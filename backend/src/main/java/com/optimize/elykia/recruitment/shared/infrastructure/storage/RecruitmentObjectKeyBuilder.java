package com.optimize.elykia.recruitment.shared.infrastructure.storage;

public final class RecruitmentObjectKeyBuilder {

    private RecruitmentObjectKeyBuilder() {
    }

    public static String offerCoverKey(long offerId, String extension) {
        return "offers/" + offerId + "/cover." + extension;
    }

    public static String applicationCvKey(long applicationId, String extension) {
        return "applications/" + applicationId + "/cv." + extension;
    }

    public static String extensionFromContentType(String contentType) {
        if (contentType == null) {
            return "bin";
        }
        return switch (contentType.toLowerCase()) {
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "application/pdf" -> "pdf";
            default -> "bin";
        };
    }
}
