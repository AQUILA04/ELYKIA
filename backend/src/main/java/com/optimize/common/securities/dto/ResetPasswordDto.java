package com.optimize.common.securities.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordDto {
    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Size(min = 6, max = 120, message = "Le mot de passe doit contenir entre 6 et 120 caractères.")
    private String newPassword;
}
