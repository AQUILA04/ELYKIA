package com.optimize.elykia.sale.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.enums.State;
import com.optimize.elykia.finance.domain.DailyAccountancy;
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
    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String collector;

    @Column(name = "commercial_username")
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }
    
    @Column(unique = true)
    private String reference; // This will store the mobile recovery ID

    private Double reliquatGeneratedAmount = 0.0;
    private Double reliquatUsedAmount = 0.0;

    private String operationConsentCode;
    private Double confirmedAmount;
    private String syncConsentCode;

    @ManyToOne
    @JsonIgnore
    private DailyAccountancy dailyAccountancy;

    public void markDeleted() {
        this.setState(State.DELETED);
    }

    /**
     * @deprecated Utiliser {@link Credit#applyRecovery(RecoveryPayment, DailyAccountancy)} qui dérive
     *             automatiquement {@code normalStake} à titre purement informatif.
     */
    @Deprecated(since = "2.17.0")
    public void checkStakeValue(Double stake) {
        if (Objects.nonNull(amount) && Objects.nonNull(stake) && Math.abs(amount - stake) < 0.001) {
            this.normalStake = Boolean.TRUE;
        } else {
            this.normalStake = Boolean.FALSE;
        }
    }

    /**
     * @deprecated Utiliser {@link Credit#applyRecovery(RecoveryPayment, DailyAccountancy)} qui calcule
     *             {@code remainingDaysCount = ceil(totalAmountRemaining / dailyStake)} de manière déterministe.
     */
    @Deprecated(since = "2.17.0")
    public void dailyStakeOperation(Credit credit) {
        this.totalAmountRemaining = credit.getTotalAmountRemaining();
        Double dailyStake = credit.getDailyStake();
        if (this.totalAmountRemaining != null && this.totalAmountRemaining <= 0.001) {
            this.remainingDaysCount = 0;
            credit.setRemainingDaysCount(0);
        } else if (dailyStake != null && dailyStake > 0 && this.totalAmountRemaining != null) {
            this.remainingDaysCount = (int) Math.ceil(this.totalAmountRemaining / dailyStake);
            credit.setRemainingDaysCount(this.remainingDaysCount);
        } else {
            this.remainingDaysCount = credit.getRemainingDaysCount();
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
