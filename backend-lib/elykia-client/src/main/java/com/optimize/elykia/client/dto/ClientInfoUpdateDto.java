package com.optimize.elykia.client.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Mise à jour des informations client depuis le mobile (sans photos).
 * Les champs firstname/lastname sont optionnels : omis ou inchangés si crédit en cours.
 */
public record ClientInfoUpdateDto(
        @NotNull(message = "L'identifiant du client est obligatoire !") Long id,
        String firstname,
        String lastname,
        @NotBlank(message = "L'adresse du client est obligatoire !") String address,
        @NotBlank(message = "Le numéro de téléphone du client est obligatoire !") String phone,
        @NotBlank(message = "Le numéro de la pièce d'identité du client est obligatoire !") String cardID,
        @NotBlank(message = "Le type de la pièce d'identité est obligatoire !") String cardType,
        @NotNull(message = "La date de naissance du client est obligatoire !") LocalDate dateOfBirth,
        String contactPersonName,
        String contactPersonPhone,
        String contactPersonAddress,
        @NotBlank(message = "La localité du client est obligatoire !") String quarter,
        @NotBlank(message = "L'occupation du client est obligatoire !") String occupation,
        Double latitude,
        Double longitude,
        String mll,
        Boolean allowNameUpdate
) {
}
