package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkChangeCollectorDto {
    @NotEmpty(message = "La liste des IDs de crédit ne peut pas être vide")
    private List<Long> creditIds;

    @NotBlank(message = "Le nouveau commercial est obligatoire")
    private String newCollector;
    private State state =State.ENABLED;

}
