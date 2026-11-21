package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.inventory.web.dto.StockEntry;
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
