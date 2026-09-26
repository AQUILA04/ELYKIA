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

    @NotBlank
    @Size(max = 50)
    private String cardType;

    @NotBlank
    @Size(max = 100)
    private String cardID;

    /** Photo de profil en base64 (data URL ou raw). */
    @NotBlank
    private String profilPhoto;

    @NotBlank
    @Pattern(regexp = "\\d{4,6}")
    private String pin;
}
