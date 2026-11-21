package com.optimize.elykia.client.dto;

import jakarta.validation.constraints.NotNull;

public record LocationUpdate(@NotNull(message = "L'identifiant du client est obligatoire !") Long id,
                             @NotNull(message = "La latitude du client est obligatoire !") Double latitude,
                             @NotNull(message = "La longitude du client est obligatoire !") Double longitude) {
}
