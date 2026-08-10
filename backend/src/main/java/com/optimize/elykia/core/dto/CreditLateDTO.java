package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.LateType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder(toBuilder = true)
public class CreditLateDTO {

    private Long        id;
    private String      reference;

    // Client
    private Long        clientId;
    private String      clientName;
    private String      clientPhone;
    private String      clientQuarter;

    // Commercial
    private String      collector;

    // Montants
    private Double      totalAmount;
    private Double      totalAmountPaid;
    /** Montant restant net du reliquat client (à encaisser). */
    private Double      totalAmountRemaining;
    /** Reliquat client imputé sur ce crédit pour le calcul du restant net. */
    private Double      clientReliquatApplied;
    private Double      dailyStake;

    // Dates
    private LocalDate   beginDate;
    private LocalDate   expectedEndDate;
    private Integer     remainingDaysCount;

    // Retard calculé
    /** Jours depuis expectedEndDate (0 si non dépassée) */
    private int         lateDaysDelai;
    /** Jours d'échéance non payés (jours écoulés − jours payés) */
    private int         lateDaysEcheance;
    /** Type de retard : DELAI, ECHEANCE ou DOUBLE */
    private LateType    lateType;

    private CreditStatus status;
}