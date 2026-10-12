package com.optimize.elykia.core.dto.debt;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateInventoryDebtRequestDto {
    @NotNull
    private Long inventoryId;

    @NotBlank
    private String storekeeperUsername;

    @NotEmpty
    private List<Long> inventoryItemIds;

    private String comment;
}
