package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.OrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class UpdateOrderStatusDto {

    @NotEmpty(message = "La liste des IDs de commande ne peut pas être vide.")
    private List<Long> orderIds;

    @NotNull(message = "Le nouveau statut ne peut pas être nul.")
    private OrderStatus newStatus;
}
