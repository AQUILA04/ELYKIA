package com.optimize.elykia.client.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePhotoUrlDto(@NotNull(message = "L'identifiant du client est obligatoire !") Long id, String profilPhotoUrl, String cardPhotoUrl) {
}
