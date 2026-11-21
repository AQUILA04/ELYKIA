package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.shared.carnet.CarnetEcartStatus;
import com.optimize.elykia.sale.domain.FieldControlStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CreditFieldControlDto {
    private Long id;
    private Long creditId;
    private String reference;
    private Double notebookTotalAmount;
    private Double systemTotalAmountPaid;
    private Double differenceAmount;
    private FieldControlStatus status;
    private LocalDateTime observedAt;
    private String observedBy;
    private String note;
    /** PENDING tant que l'écart n'est pas tranché ; null si le contrôle n'est pas un écart ouvert. */
    private CarnetEcartStatus ecartDecisionStatus;
    /** Vrai uniquement lorsqu'un nouvel envoi doit modifier ce contrôle. */
    private Boolean modifiable;
}
