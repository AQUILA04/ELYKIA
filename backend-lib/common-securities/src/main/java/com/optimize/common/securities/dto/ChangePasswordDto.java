package com.optimize.common.securities.dto;

import jakarta.validation.constraints.AssertTrue;
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

    @AssertTrue(message = "L'ancien mot de passe est obligatoire.")
    public boolean isOldPasswordProvidedWhenNotForced() {
        if (Boolean.TRUE.equals(forced)) {
            return true;
        }
        return oldPassword != null && !oldPassword.isBlank();
    }
}
