package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateStockRequestFromOrdersDto {

    @NotEmpty(message = "La liste des IDs de commande ne peut pas être vide.")
    private List<Long> orderIds;

    private Boolean forNextMonth = false;
}
