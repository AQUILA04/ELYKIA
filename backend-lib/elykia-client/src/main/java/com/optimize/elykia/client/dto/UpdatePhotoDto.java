package com.optimize.elykia.client.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePhotoDto(@NotNull(message = "L'identifiant du client est obligatoire !") Long clientId,
                             String profilPhoto,
                             String cardPhoto,
                             String cardType,
                             String cardNumber) {
}
