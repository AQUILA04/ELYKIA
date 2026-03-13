package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
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
    private State state =State.ENABLED;

}
