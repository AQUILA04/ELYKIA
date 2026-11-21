package com.optimize.elykia.reporting.web;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.tontine.web.dto.CommercialTontineYearlySummaryDto;
import com.optimize.elykia.sale.web.dto.RemainingAtClientsPageDto;
import com.optimize.elykia.tontine.application.CommercialTontineYearlySummaryService;
import com.optimize.elykia.sale.application.RemainingAtClientsPdfService;
import com.optimize.elykia.sale.application.RemainingAtClientsService;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import com.optimize.elykia.shared.security.UserProfilConstant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de synthèse annuelle portefeuille (tontine & reste chez les clients) exposés sous
 * {@code /api/daily-commercial-reports}, conservés dans {@code core} pour découpler le module {@code finance}.
 */
@RestController
@RequestMapping("/api/daily-commercial-reports")
@RequiredArgsConstructor
@Tag(name = "Daily Commercial Reports", description = "Endpoints for retrieving daily commercial reports and KPIs")
public class DailyReportPortfolioController {

    private final UserService userService;
    private final RemainingAtClientsService remainingAtClientsService;
    private final RemainingAtClientsPdfService remainingAtClientsPdfService;
    private final CommercialTontineYearlySummaryService commercialTontineYearlySummaryService;

    @GetMapping("/yearly-tontine-summary")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_RAPPORT_JOURNALIER + "')")
    @Operation(summary = "Get yearly tontine collections and deposits for a commercial")
    public ResponseEntity<CommercialTontineYearlySummaryDto> getYearlyTontineSummary(
            @RequestParam("year") int year,
            @RequestParam(value = "collector", required = false) String collector) {

        String commercialUsername = resolveCommercialUsername(collector);
        if (commercialUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(
                commercialTontineYearlySummaryService.buildYearlySummary(commercialUsername, year));
    }

    @GetMapping("/yearly-remaining-credits")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_RAPPORT_JOURNALIER + "')")
    @Operation(summary = "Paginated list of credits still owed by clients for a commercial year")
    public ResponseEntity<RemainingAtClientsPageDto> getYearlyRemainingCredits(
            @RequestParam("year") int year,
            @RequestParam(value = "collector", required = false) String collector,
            @PageableDefault(size = 25) Pageable pageable) {

        String commercialUsername = resolveCommercialUsername(collector);
        if (commercialUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(remainingAtClientsService.getPage(commercialUsername, year, pageable));
    }

    @GetMapping("/yearly-remaining-credits/export/pdf")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_RAPPORT_JOURNALIER + "')")
    @Operation(summary = "Export remaining-at-clients credits as PDF for a commercial year")
    public ResponseEntity<byte[]> exportYearlyRemainingCreditsPdf(
            @RequestParam("year") int year,
            @RequestParam(value = "collector", required = false) String collector) {

        String commercialUsername = resolveCommercialUsername(collector);
        if (commercialUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        byte[] pdfBytes = remainingAtClientsPdfService.generatePdf(commercialUsername, year);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=reste_chez_les_clients_" + commercialUsername + "_" + year + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    private String resolveCommercialUsername(String collector) {
        User currentUser = userService.getCurrentUser();
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return currentUser.getUsername();
        }
        if (collector == null || collector.isEmpty()) {
            return null;
        }
        return collector;
    }
}
