package com.optimize.elykia.finance.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Session autonome de caisse « Ventes comptant » (indépendante des journées comptables). */
@Entity
@Table(name = "cash_sales_register_session")
@Getter
@Setter
public class CashSalesRegisterSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "cashier_username", nullable = false, length = 100)
    private String cashierUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CashSalesRegisterStatus status = CashSalesRegisterStatus.OPEN;

    @Column(name = "opening_float", nullable = false)
    private Double openingFloat = 0.0;

    @Column(name = "total_receipts", nullable = false)
    private Double totalReceipts = 0.0;

    @Column(name = "total_reversals", nullable = false)
    private Double totalReversals = 0.0;

    @Column(name = "receipts_count", nullable = false)
    private Integer receiptsCount = 0;

    @Column(name = "reversals_count", nullable = false)
    private Integer reversalsCount = 0;

    @Column(name = "expected_closing", nullable = false)
    private Double expectedClosing = 0.0;

    @Column(name = "counted_closing")
    private Double countedClosing;

    @Column(name = "discrepancy")
    private Double discrepancy;

    @Column(name = "closing_notes", length = 255)
    private String closingNotes;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    public void addReceipt(double amount) {
        totalReceipts = (totalReceipts != null ? totalReceipts : 0.0) + amount;
        receiptsCount = (receiptsCount != null ? receiptsCount : 0) + 1;
        refreshExpected();
    }

    public void addReversal(double amount) {
        totalReversals = (totalReversals != null ? totalReversals : 0.0) + amount;
        reversalsCount = (reversalsCount != null ? reversalsCount : 0) + 1;
        refreshExpected();
    }

    public void refreshExpected() {
        double opening = openingFloat != null ? openingFloat : 0.0;
        double receipts = totalReceipts != null ? totalReceipts : 0.0;
        double reversals = totalReversals != null ? totalReversals : 0.0;
        expectedClosing = opening + receipts - reversals;
    }
}
