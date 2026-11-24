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

/** Écriture immuable du journal de caisse ventes comptant (encaissement ou extourne). */
@Entity
@Table(name = "cash_sales_register_entry")
@Getter
@Setter
public class CashSalesRegisterEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, updatable = false)
    private Long sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, updatable = false, length = 20)
    private CashSalesRegisterEntryType entryType;

    @Column(name = "amount", nullable = false, updatable = false)
    private Double amount;

    @Column(name = "signed_amount", nullable = false, updatable = false)
    private Double signedAmount;

    @Column(name = "sale_id", updatable = false)
    private Long saleId;

    @Column(name = "sale_reference", updatable = false, length = 100)
    private String saleReference;

    @Column(name = "client_id", updatable = false)
    private Long clientId;

    @Column(name = "client_name", updatable = false, length = 200)
    private String clientName;

    @Column(name = "collector", updatable = false, length = 100)
    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String collector;

    @Column(name = "commercial_username")
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }

    @Column(name = "performed_by", nullable = false, updatable = false, length = 100)
    private String performedBy;

    @Column(name = "accounting_date", nullable = false, updatable = false)
    private LocalDate accountingDate;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    @Column(name = "notes", updatable = false, length = 255)
    private String notes;
}
