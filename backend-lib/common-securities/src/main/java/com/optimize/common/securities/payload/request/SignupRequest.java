package com.optimize.common.securities.payload.request;


import com.optimize.common.entities.annotations.NotStringValue;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SignupRequest {
  @NotBlank
  @Size(min = 3, max = 20)
  private String username;
  @NotBlank
  @Size(max = 50)
  @Email
  private String email;
  @NotBlank(message = "Le prénom de l'utilisateur est obligatoire !")
  @NotStringValue(message = "La valeur du prénom n'est pas autorisée !")
  private String firstname;
  @NotBlank(message = "Le nom de l'utilisateur est obligatoire !")
  @NotStringValue(message = "La valeur du nom n'est pas autorisée !")
  private String lastname;
  @NotBlank(message = "Le sexe de l'utilisateur est obligatoire !")
  @NotStringValue(message = "La valeur du sexe n'est pas autorisée !")
  private String gender;
  @NotBlank(message = "Le mot de passe de l'utilisateur est obligatoire !")
  @Size(min = 6, max = 40, message = "La taille du mot de passe de l'utilisateur doit être comprise entre 6 et 40 !")
  private String password;
  @NotBlank(message = "Le numéro de téléphone de l'utilisateur est obligatoire !")
  @NotStringValue(message = "La valeur du numéro de téléphone n'est pas autorisée !")
  private String phone;
  @NotNull(message = "L'identifiant du profil de l'utilisateur est obligatoire !")
  private Long profilId;
}
