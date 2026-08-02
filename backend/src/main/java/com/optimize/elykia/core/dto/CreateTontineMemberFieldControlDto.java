package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class CreateTontineMemberFieldControlDto {

    @NotBlank(message = "La référence d'idempotence est obligatoire")
    @Size(max = 64, message = "La référence ne peut pas dépasser 64 caractères")
    private String reference;

    @NotEmpty(message = "Au moins un mois doit être renseigné")
    @Valid
    private List<CreateTontineMemberFieldControlMonthDto> months;

    private LocalDateTime observedAt;

    private String note;
}
