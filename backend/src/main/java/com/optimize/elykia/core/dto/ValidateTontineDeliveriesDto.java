package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ValidateTontineDeliveriesDto {
    @NotEmpty(message = "La liste des livraisons ne peut pas être vide.")
    private List<Long> deliveryIds;
}
