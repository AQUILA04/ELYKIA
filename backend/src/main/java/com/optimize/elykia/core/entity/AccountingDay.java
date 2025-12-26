package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class AccountingDay extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, updatable = false)
    private LocalDate accountingDate = LocalDate.now();
    @Enumerated(EnumType.STRING)
    private AccountingDayStatus status = AccountingDayStatus.OPENED;

    public void close() {
        this.status = AccountingDayStatus.CLOSED;
    }
}
