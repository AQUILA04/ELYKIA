package com.optimize.elykia.core.entity.view;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.enumaration.AccountancyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Subselect;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Immutable
@Table(name = "accountancy_report_view")
@NoArgsConstructor
@Subselect(value = """
        SELECT da.id,
                  da.date_reg,
                  da.visibility,
                  da.accounting_date,
                  da.balance_difference,
                  da.collector,
                  da.real_balance,
                  da.status,
                  da.system_balance,
                  da.daily_accounting_id,
                  u.usefstnam AS collector_firstname,
                  u.uselstnam AS collector_lastname,
                  u.usephon AS collector_phone
           FROM daily_accountancy da
           JOIN uacc ua ON da.collector::text = ua.accuser::text
           JOIN users u ON u.accid = ua.accid
""")
public class AccountancyReportView {
    @Id
    private Long id;
    @Column(name = "date_reg")
    private LocalDateTime createdDate;
    @Enumerated(EnumType.STRING)
    private State visibility;
    @Column(name = "accounting_date")
    private LocalDate accountingDate;
    private Double balanceDifference;
    private String collector;
    private Double realBalance;
    @Enumerated(EnumType.STRING)
    private AccountancyStatus status;
    private Double systemBalance;
    private Long dailyAccountingId;
    private String collectorFirstname;
    private String collectorLastname;
    private String collectorPhone;
    @Transient
    private LocalDate dateFrom;
    @Transient
    private LocalDate dateTo;
    @Transient
    private Double releasedTotalAmount;

    public AccountancyReportView(String collector, String collectorFirstname, String collectorLastname, LocalDate from, LocalDate to, double systemBalance, double realBalance) {
        this.collector = collector;
        this.collectorFirstname = collectorFirstname;
        this.collectorLastname = collectorLastname;
        this.systemBalance = systemBalance;
        this.realBalance = realBalance;
        this.dateFrom = from;
        this.dateTo = to;
        if (this.systemBalance > this.realBalance) {
            this.status = AccountancyStatus.MISSING;
        } else if (this.systemBalance < this.realBalance) {
            this.status = AccountancyStatus.SURPLUS;
        } else {
            this.status = AccountancyStatus.COMPLIANT;
        }
    }
}
