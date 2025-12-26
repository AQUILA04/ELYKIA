package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
public class StockEntryDto {
    @NotNull(message = "Les informations sur l'entrée de stock est obligatoire !")
    private Set<StockEntry> articleEntries = new HashSet<>();
}
