package com.optimize.elykia.finance.web.dto;

import com.optimize.elykia.finance.domain.CashSalesRegisterEntry;
import com.optimize.elykia.finance.domain.CashSalesRegisterSession;

import java.time.LocalDate;
import java.util.List;

/** Synthèse des opérations de la caisse « Ventes comptant » sur une période (intégrée au rapport journalier). */
public record CashSalesRegisterSummaryDto(
        LocalDate startDate,
        LocalDate endDate,
        int sessionsCount,
        int openSessionsCount,
        int receiptsCount,
        int reversalsCount,
        double totalOpeningFloat,
        double totalReceipts,
        double totalReversals,
        double netSalesAmount,
        double totalDiscrepancy,
        List<CashSalesRegisterSession> sessions,
        List<CashSalesRegisterEntry> entries) {
}
