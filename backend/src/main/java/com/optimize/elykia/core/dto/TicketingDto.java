package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TicketingDto {
    @NotBlank(message = "Le nom d'utilisateur de l'agent est obligatoire !")
    private String collector;
    @NotNull(message = "Le montant total du billetage est obligatoire !")
    private Double totalAmount;
    @NotBlank(message = "Les données convertit en json du billetage est obligatoire !")
    private String ticketingJson;
    private State state =State.ENABLED;

}
