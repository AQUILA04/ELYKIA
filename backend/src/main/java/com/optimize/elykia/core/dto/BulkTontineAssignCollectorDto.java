package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BulkTontineAssignCollectorDto {

    @NotEmpty(message = "Au moins un membre doit être sélectionné")
    @Size(max = 500, message = "Maximum 500 membres par opération")
    private List<Long> memberIds;

    @NotBlank(message = "Le commercial tontine est obligatoire")
    private String tontineCollector;
}
