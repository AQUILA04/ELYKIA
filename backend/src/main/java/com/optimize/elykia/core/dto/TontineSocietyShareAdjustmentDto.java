package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.tontine.TontineSocietyShareAdjustment;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentOutcome;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentSource;
import com.optimize.elykia.core.enumaration.TontineSocietyShareStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** Une saisie de part société (historique) et, en réponse à une saisie, l'état du membre après. */
@Data
@Builder
public class TontineSocietyShareAdjustmentDto {
    private Long id;
    private Long tontineMemberId;
    private String reference;
    private String deliveryReference;
    private TontineSocietyShareAdjustmentSource source;
    private TontineSocietyShareAdjustmentOutcome outcome;
    private Boolean supervisor;
    private Double regularContribution;
    private Double computedSocietyShare;
    private Double previousSocietyShare;
    private Double declaredSocietyShare;
    private Double newSocietyShare;
    private Double delta;
    private Double previousAvailable;
    private Double newAvailable;
    private String comment;
    private String adjustedBy;
    private LocalDateTime adjustedAt;
    private String commercialUsername;

    /** Etat du membre après la saisie (réponse uniquement). */
    private TontineSocietyShareStatus memberSocietyShareStatus;
    private Boolean memberSocietyShareLocked;
    private Double memberSocietyShare;
    private Double memberAvailableContribution;
    private Double memberProjectedBalance;
    /** Message à afficher tel quel sur l'écran. */
    private String message;

    public static TontineSocietyShareAdjustmentDto from(TontineSocietyShareAdjustment a) {
        return TontineSocietyShareAdjustmentDto.builder()
                .id(a.getId())
                .tontineMemberId(a.getTontineMemberId())
                .reference(a.getReference())
                .deliveryReference(a.getDeliveryReference())
                .source(a.getSource())
                .outcome(a.getOutcome())
                .supervisor(Boolean.TRUE.equals(a.getSupervisor()))
                .regularContribution(a.getRegularContribution())
                .computedSocietyShare(a.getComputedSocietyShare())
                .previousSocietyShare(a.getPreviousSocietyShare())
                .declaredSocietyShare(a.getDeclaredSocietyShare())
                .newSocietyShare(a.getNewSocietyShare())
                .delta(a.getDelta())
                .previousAvailable(a.getPreviousAvailable())
                .newAvailable(a.getNewAvailable())
                .comment(a.getComment())
                .adjustedBy(a.getAdjustedBy())
                .adjustedAt(a.getAdjustedAt())
                .commercialUsername(a.getCommercialUsername())
                .build();
    }
}
