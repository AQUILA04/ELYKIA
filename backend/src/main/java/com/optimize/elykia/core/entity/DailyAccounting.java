package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Set;

@Entity
@Getter
@Setter
public class DailyAccounting extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Double totalAmount;
    private LocalDate accountingDate = LocalDate.now();
    @Enumerated(EnumType.STRING)
    private AccountingDayStatus status = AccountingDayStatus.CURRENT;
    @OneToMany
    private Set<DailyAccountancy> accounts;
}
