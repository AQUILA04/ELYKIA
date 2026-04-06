package com.optimize.elykia.core.entity.agency;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.WeekStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class AgencyWeeklyReport extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer weekNumber;
    private LocalDate weekFrom;
    private LocalDate weekTo;
    private Double totalAmount = 0D;
    private Double totalCollection = 0D;
    private Double totalSpending = 0D;
    @Enumerated(EnumType.STRING)
    private WeekStatus status;
    @ManyToOne
    private Agency agency;

    public void addDailyReport(Double collection, Double spending, Double balance) {
        this.totalCollection += collection;
        this.totalSpending += spending;
        this.totalAmount += balance;
    }

}
