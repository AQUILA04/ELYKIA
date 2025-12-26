package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.AccountancyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class DailyAccountancy extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Double systemBalance = 0D;
    private Double realBalance = 0D;
    @Enumerated(EnumType.STRING)
    private AccountancyStatus status = AccountancyStatus.COMPLIANT;
    private Double balanceDifference = 0D;
    @Column(updatable = false)
    private String collector;
    @Column(updatable = false)
    private LocalDate accountingDate = LocalDate.now();
    @ManyToOne
    private DailyAccounting dailyAccounting;
    private String ticketingJson;
    @Column(columnDefinition = "boolean default true")
    private Boolean isOpened = Boolean.TRUE;

    public void setUp() {
        if (realBalance != 0D) {
            if (systemBalance > realBalance) {
                status = AccountancyStatus.MISSING;
                balanceDifference = systemBalance - realBalance;
            } else if (realBalance > systemBalance) {
                status = AccountancyStatus.SURPLUS;
                balanceDifference = realBalance - systemBalance;
            }
        }
    }
}
