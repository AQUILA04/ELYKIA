package com.optimize.elykia.core.entity.report;

import com.optimize.elykia.core.entity.expense.Expense;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cash_period_remittance_expense")
@Getter
@Setter
@NoArgsConstructor
public class CashPeriodRemittanceExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remittance_id", nullable = false)
    private CashPeriodRemittance remittance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;
}
