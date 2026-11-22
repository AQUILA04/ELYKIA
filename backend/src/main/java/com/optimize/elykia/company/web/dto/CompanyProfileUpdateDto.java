package com.optimize.elykia.company.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CompanyProfileUpdateDto(
        @NotBlank(message = "Le nom de l'entreprise est obligatoire")
        @Size(max = 150, message = "Le nom de l'entreprise ne doit pas dépasser 150 caractères")
        String companyName,

        @Size(max = 60, message = "Le nom court ne doit pas dépasser 60 caractères")
        String shortName,

        @Size(max = 180, message = "Le slogan ne doit pas dépasser 180 caractères")
        String tagline,

        @Size(max = 255, message = "L'adresse ne doit pas dépasser 255 caractères")
        String address,

        @Size(max = 50, message = "Le téléphone ne doit pas dépasser 50 caractères")
        String phone,

        @Email(message = "L'adresse e-mail est invalide")
        @Size(max = 150, message = "L'adresse e-mail ne doit pas dépasser 150 caractères")
        String email,

        @Size(max = 255, message = "Le site web ne doit pas dépasser 255 caractères")
        String website,

        @Size(max = 80, message = "L'identifiant fiscal ne doit pas dépasser 80 caractères")
        String taxId,

        @NotBlank(message = "La couleur primaire est obligatoire")
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur primaire doit être au format hexadécimal #RRGGBB")
        String primaryColor,

        @NotBlank(message = "La couleur secondaire est obligatoire")
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur secondaire doit être au format hexadécimal #RRGGBB")
        String secondaryColor,

        @NotBlank(message = "La couleur d'accent est obligatoire")
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur d'accent doit être au format hexadécimal #RRGGBB")
        String accentColor,

        @NotBlank(message = "La couleur du menu latéral est obligatoire")
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur du menu latéral doit être au format hexadécimal #RRGGBB")
        String sidebarBgColor,

        @NotBlank(message = "La couleur du texte du menu est obligatoire")
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur du texte du menu doit être au format hexadécimal #RRGGBB")
        String sidebarTextColor,

        @NotBlank(message = "La couleur de fond est obligatoire")
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur de fond doit être au format hexadécimal #RRGGBB")
        String backgroundColor
) {
}
