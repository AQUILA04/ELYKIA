package com.optimize.elykia.core.entity.debt;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.enumaration.DebtHolderProfile;
import com.optimize.elykia.core.enumaration.DebtOrigin;
import com.optimize.elykia.core.enumaration.DebtPeriodGrain;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "debt_document")
@Getter
@Setter
@NoArgsConstructor
public class DebtDocument extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @Column(name = "holder_username", nullable = false, length = 100)
    private String holderUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "holder_profile", nullable = false, length = 30)
    private DebtHolderProfile holderProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = "debt_type", nullable = false, length = 40)
    private DebtType debtType;

    @Enumerated(EnumType.STRING)
    @Column(name = "period_grain", nullable = false, length = 10)
    private DebtPeriodGrain periodGrain;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month")
    private Integer periodMonth;

    @Column(name = "period_day")
    private LocalDate periodDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DebtStatus status = DebtStatus.OPEN;

    @Column(name = "gross_amount", nullable = false)
    private Double grossAmount = 0.0;

    @Column(name = "offset_amount", nullable = false)
    private Double offsetAmount = 0.0;

    @Column(name = "paid_amount", nullable = false)
    private Double paidAmount = 0.0;

    @Column(name = "remaining_amount", nullable = false)
    private Double remainingAmount = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "monthly_stock_id")
    @JsonIgnore
    private CommercialMonthlyStock monthlyStock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_report_id")
    @JsonIgnore
    private DailyCommercialReport dailyReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id")
    @JsonIgnore
    private Inventory inventory;

    @Enumerated(EnumType.STRING)
    @Column(name = "debt_origin", nullable = false, length = 30)
    private DebtOrigin debtOrigin = DebtOrigin.CASH_CONSTITUTION;

    /** CREDIT ou TONTINE pour un manquant issu d'un contrôle de carnet. */
    @Column(name = "cash_category", length = 20)
    private String cashCategory;

    @Column(name = "carnet_ecart_decision_id")
    private Long carnetEcartDecisionId;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "cancelled_by", length = 100)
    private String cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 1000)
    private String cancelReason;

    @OneToMany(mappedBy = "debtDocument", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DebtLine> lines = new ArrayList<>();

    public void addLine(DebtLine line) {
        lines.add(line);
        line.setDebtDocument(this);
    }

    public void refreshRemainingAndStatus() {
        double gross = safe(grossAmount);
        double offset = safe(offsetAmount);
        double paid = safe(paidAmount);
        this.remainingAmount = Math.max(0D, Math.ceil(gross - offset - paid));
        if (this.status == DebtStatus.CANCELLED) {
            return;
        }
        if (this.remainingAmount <= 0D) {
            this.status = DebtStatus.SETTLED;
            this.remainingAmount = 0D;
        } else if (offset + paid > 0D) {
            this.status = DebtStatus.PARTIALLY_SETTLED;
        } else {
            this.status = DebtStatus.OPEN;
        }
    }

    private static double safe(Double value) {
        return value != null ? value : 0D;
    }
}
