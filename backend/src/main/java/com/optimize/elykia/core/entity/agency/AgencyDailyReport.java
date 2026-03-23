package com.optimize.elykia.core.entity.agency;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class AgencyDailyReport extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    private Agency agency;
    private Double collection = 0D;
    private Double spending = 0D;
    private Double balance = 0D;
    private String day;
    private LocalDate recoveryDate = LocalDate.now();
    @ManyToOne
    private AgencyWeeklyReport agencyWeeklyReport;


}
