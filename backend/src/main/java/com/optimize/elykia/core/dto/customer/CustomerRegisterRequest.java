package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CustomerRegisterRequest {

    @NotBlank
    private String phone;

    @NotBlank
    private String otpProofToken;

    @NotBlank
    @Size(max = 100)
    private String firstname;

    @NotBlank
    @Size(max = 100)
    private String lastname;

    @NotBlank
    @Size(max = 255)
    private String address;

    @NotBlank
    @Size(max = 100)
    private String quarter;

    @NotNull
    private LocalDate dateOfBirth;

    @NotBlank
    @Size(max = 100)
    private String occupation;

    /** Optionnel à l'inscription — renseigné via onboarding pièce d'identité. */
    @Size(max = 50)
    private String cardType;

    /** Optionnel à l'inscription — renseigné via onboarding pièce d'identité. */
    @Size(max = 100)
    private String cardID;

    /** Photo de profil en base64 (data URL ou raw). */
    @NotBlank
    private String profilPhoto;

    /** Coordonnées GPS capturées à l'inscription (optionnelles si refus permission). */
    private Double latitude;

    private Double longitude;

    /** Lien Google Maps dérivé (latitude,longitude). */
    @Size(max = 512)
    private String mll;

    @NotBlank
    @Pattern(regexp = "\\d{4,6}")
    private String pin;
}
