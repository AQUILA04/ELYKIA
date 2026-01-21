package com.optimize.common.securities.payload.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class AddPermissionDto {
    @NotNull(message = "L'identifiant du profil est obligatoire !")
    private Long profilId;
    @NotNull(message = "Vous devez ajouter une permission")
    private Set<String> permissions;
}
