package com.optimize.common.securities.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class RequirePasswordChangeDto {
    @NotEmpty(message = "La liste des utilisateurs est obligatoire.")
    private List<Long> userIds;
}
