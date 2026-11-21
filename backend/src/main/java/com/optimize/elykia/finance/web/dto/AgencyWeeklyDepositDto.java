package com.optimize.elykia.finance.web.dto;

import com.optimize.elykia.finance.domain.DepositStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AgencyWeeklyDepositDto {
    private Long id;
    @NotNull(message = "Veuillez choisir l'agence !")
    private Long agencyId;
    @NotNull(message = "Le montant total est obligatoire !")
    private Double totalAmount;
    @NotNull(message = "Veuillez renseigner le statut du dépôt")
    private DepositStatus depositStatus;
    private Double irregularityAmount;
    @NotNull(message = "Le solde du dépôt est obligatoire !")
    private Double balance;
}
