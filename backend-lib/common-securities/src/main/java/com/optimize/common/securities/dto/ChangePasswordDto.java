package com.optimize.common.securities.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangePasswordDto {
    private Long id;
    @NotBlank(message = "Le nom d'utilisateur est obligatoire !")
    private String username;
    private String oldPassword;
    @NotBlank(message = "Le nouveau mot de passe est obligatoire !")
    private String newPassword;
    private Boolean forced;
}
