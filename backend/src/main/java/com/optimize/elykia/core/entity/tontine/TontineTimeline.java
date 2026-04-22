package com.optimize.elykia.core.entity.tontine;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class TontineTimeline extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    private Tontine tontine;
    private Double amount;
    private Boolean defaultStake = Boolean.TRUE;
    private String promoter;
    private Double totalAmountRemaining;
    private Integer remainingMonthsCount;
}
