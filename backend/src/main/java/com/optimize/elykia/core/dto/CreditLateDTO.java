package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.LateType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class CreditLateDTO {

    private Long        id;
    private String      reference;

    // Client
    private String      clientName;
    private String      clientPhone;

    // Commercial
    private String      collector;

    // Montants
    private Double      totalAmount;
    private Double      totalAmountPaid;
    private Double      totalAmountRemaining;
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
