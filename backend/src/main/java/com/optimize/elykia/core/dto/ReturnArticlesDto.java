package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class ReturnArticlesDto {
    @NotNull
    private Long creditId;
    @NotNull
    @Valid
    private Set<StockEntry> returnArticles;
}
