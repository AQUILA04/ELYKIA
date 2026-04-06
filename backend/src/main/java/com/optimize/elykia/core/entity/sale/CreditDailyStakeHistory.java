package com.optimize.elykia.core.entity.sale;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import com.optimize.common.entities.entity.BaseEntity;

@Entity
@Table(name = "credit_daily_stake_history")
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
public class CreditDailyStakeHistory extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_id", nullable = false)
    @JsonIgnore
    private Credit credit;

    @Column(name = "old_daily_stake", nullable = false)
    private Double oldDailyStake;

    @Column(name = "new_daily_stake", nullable = false)
    private Double newDailyStake;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;

    @Column(name = "amount_remaining", nullable = false)
    private Double amountRemaining;

    public String getAuthor() {
        return this.createdBy;
    }
}