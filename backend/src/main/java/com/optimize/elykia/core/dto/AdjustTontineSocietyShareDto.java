package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentSource;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

/** Part société réelle sur toute l'année, saisie pour un membre. */
@Data
public class AdjustTontineSocietyShareDto {

    /** Référence d'idempotence produite par l'écran : un rejeu renvoie le résultat déjà enregistré. */
    @Size(max = 64, message = "La référence ne peut pas dépasser 64 caractères")
    private String reference;

    @NotNull(message = "Le montant de la part société est obligatoire")
    @PositiveOrZero(message = "La part société ne peut pas être négative")
    private Double declaredSocietyShare;

    @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères")
    private String comment;

    private TontineSocietyShareAdjustmentSource source;

    /** Heure de la saisie sur le téléphone (saisie hors ligne). */
    private LocalDateTime observedAt;
}
