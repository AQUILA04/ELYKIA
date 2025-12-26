package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class MergeCreditDto {
    @NotEmpty(message = "La liste des IDs de crédit ne peut pas être vide")
    private List<Long> creditIds;
    
    @NotNull(message = "Le nom d'utilisateur du commercial est requis")
    private String commercialUsername;
}