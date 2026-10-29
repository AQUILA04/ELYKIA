package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class TontineMemberFieldControlDto {
    private Long id;
    private Long tontineMemberId;
    private String reference;
    private Double notebookTotalAmount;
    private Double systemTotalAmount;
    private Double differenceAmount;
    private FieldControlStatus status;
    private LocalDateTime observedAt;
    private String observedBy;
    private String note;
    private List<TontineMemberFieldControlLineDto> lines;
    /** Récapitulatif des commerciaux contrôlés dans cette visite. */
    private List<TontineMemberFieldControlCollectorDto> collectors;
    /** Commerciaux du membre absents de ce contrôle (non contrôlés). */
    private List<String> uncontrolledCollectors;
    /** PENDING tant que l'écart n'est pas tranché ; null si le contrôle n'est pas un écart ouvert. */
    private CarnetEcartStatus ecartDecisionStatus;
    /** Vrai uniquement lorsqu'un nouvel envoi doit modifier ce contrôle. */
    private Boolean modifiable;
    /** État du carnet après ce contrôle (vérifié si le paramètre d'auto-vérification est actif). */
    private Boolean carnetVerified;
    private LocalDateTime carnetVerifiedAt;
    private String carnetVerifiedBy;
}
