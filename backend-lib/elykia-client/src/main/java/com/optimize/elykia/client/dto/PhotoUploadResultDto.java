package com.optimize.elykia.client.dto;

public record PhotoUploadResultDto(
        Long clientId,
        String profilPhotoUrl,
        String cardPhotoUrl,
        String profilPhotoThumbUrl,
        String cardPhotoThumbUrl
) {
}
