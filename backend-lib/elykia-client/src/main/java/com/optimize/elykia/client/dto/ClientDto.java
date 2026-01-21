package com.optimize.elykia.client.dto;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.enumeration.ClientType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.ToString;

import java.time.LocalDate;
import java.util.Objects;

@Data
public class ClientDto {
    private Long id;
    @NotBlank(message = "Le prénom du client est obligatoire ")
    private String firstname;
    @NotBlank(message = "Le Nom de famille du client est obligatoire !")
    private String lastname;
    @NotBlank(message = "L'adresse du client est obligatoire !")
    private String address;
    @NotBlank(message = "Le numéro de téléphone du client est obligatoire !")
    private String phone;
    @NotBlank(message = "Le numéro de la pièce d'identité du client est obligatoire !")
    private String cardID;
    @NotBlank(message = "Le type de la pièce d'identité est obligatoire !")
    private String cardType;
    @NotNull(message = "La date de naissance du client est obligatoire !")
    private LocalDate dateOfBirth;
    private String IDDoc;
    //@NotBlank(message = "Le nom complet de la personne est obligatoire !")
    private String contactPersonName;
    //@NotBlank(message = "Le numéro de téléphone de la personne à contacter est obligatoire !")
    private String contactPersonPhone;
    //@NotBlank(message = "L'adresse de la personne à contacter est obligatoire !")
    private String contactPersonAddress;
    @NotBlank(message = "Veuillez renseigner l'agent collecteur du client !")
    private String collector;
    @NotBlank(message = "La localité du client est obligatoire !")
    private String quarter;
    private Boolean creditInProgress;
    @NotBlank(message = "L'occupation du client est obligatoire !")
    private String occupation;
    private ClientType clientType;
    private Double latitude;
    private Double longitude;
    private String mll;
    @ToString.Exclude
    private String profilPhoto;
    private LocalDate syncDate;
    private String code;
    private String profilPhotoUrl;
    private String cardPhotoUrl;
    private String tontineCollector;
    private String agencyCollector;
    private boolean isTontineMember;

    public void checkDocValue() {
        if (Objects.isNull(id) && Objects.isNull(IDDoc)) {
            throw new CustomValidationException("La photo de la pièce d'identité est obligatoire");
        }
    }
}
