package com.optimize.elykia.client.dto;

public record ClientPhotoCheckDto(Long clientId, boolean missingProfil, boolean missingCard) {
}
