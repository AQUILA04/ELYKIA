package com.optimize.elykia.core.entity.tontine;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.enumaration.CreditStatus;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@ToString
@EqualsAndHashCode(callSuper = false)
public class Tontine extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    private Client client;
    private LocalDate beginDate;
    private LocalDate expectedEndDate;
    private LocalDate effectiveEndDate;
    private Double totalAmount;
    private Double totalAmountPaid;
    private Double totalAmountRemaining;
    private Double monthlyStake;
    private CreditStatus status;
    private Integer remainingMonthCount;
    private String promoter;

}
