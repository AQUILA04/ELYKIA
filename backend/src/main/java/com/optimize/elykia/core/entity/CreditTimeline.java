package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.exception.ApplicationException;
import jakarta.persistence.*;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Getter
@Setter
public class CreditTimeline extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JsonIgnore
    private Credit credit;
    private Double amount;
    private Boolean normalStake;
    @PositiveOrZero
    private Integer remainingDaysCount;
    private Double totalAmountRemaining;
    private String collector;
    
    @Column(unique = true)
    private String reference; // This will store the mobile recovery ID

    @ManyToOne
    @JsonIgnore
    private DailyAccountancy dailyAccountancy;

    public void checkStakeValue(Double stake) {
        // SUPPRIMÉ : Ancienne vérification qui obligeait à ce que la mise soit un multiple.
        // if (amount % stake != 0) {
        //     throw new ApplicationException("La valeur de la mise journalière doit être " + stake + " ou un de ces multiple !");
        // }

        // La nouvelle vérification (montant > mise normale) se fait maintenant dans le CreditTimelineService.
        // On peut garder celle-ci comme sécurité additionnelle pour les mises spéciales.
//        if (Boolean.FALSE.equals(normalStake) && amount <= stake) {
//            throw new ApplicationException("La valeur de la mise journalière spéciale doit être supérieur à " + stake);
//        }

        if (Objects.isNull(normalStake) && Objects.equals(amount, stake)) {
            this.normalStake = Boolean.TRUE;
        } else {
            this.normalStake = Boolean.FALSE;
        }
    }

    public void dailyStakeOperation(Credit credit) {
        this.remainingDaysCount = credit.getRemainingDaysCount();
        totalAmountRemaining = credit.getTotalAmountRemaining();
        if (remainingDaysCount > 0) {
            if (Boolean.TRUE.equals(normalStake)) {
                remainingDaysCount -= 1;
            } else {
                remainingDaysCount -= (int) (amount / credit.getDailyStake());
            }
            credit.setRemainingDaysCount(remainingDaysCount);
        }
    }

    public Double getDailyStakeAmount() {
        if (Objects.nonNull(credit)) {
            return credit.getDailyStake();
        }
        return null;
    }

    public LocalDate getCreationDate() {
        return createdDate.toLocalDate();
    }
}
