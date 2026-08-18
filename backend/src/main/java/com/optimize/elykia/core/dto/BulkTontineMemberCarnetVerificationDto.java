package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BulkTontineMemberCarnetVerificationDto {

    @NotEmpty(message = "Au moins un membre doit être sélectionné")
    @Size(max = 500, message = "Maximum 500 membres par opération")
    private List<Long> memberIds;

    @NotNull(message = "Le statut de vérification est obligatoire")
    private Boolean verified;
}
