package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CompareSessionsRequestDto {
    
    @NotEmpty(message = "La liste des années ne peut pas être vide")
    @Size(min = 2, max = 5, message = "Vous devez sélectionner entre 2 et 5 années")
    private List<Integer> years;
}
