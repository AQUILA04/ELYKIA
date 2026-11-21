package com.optimize.elykia.core.service.report;


import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.UnitPriceVisibility;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.core.dto.DailyReportExportPdfDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * PDF « Rapport commercial » : rapprochement de la période (mêmes chiffres que la fiche à l'écran),
 * activité et détail des opérations. Design system documents Elykia, pagination n/N.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyReportPdfService {

    static final String DOCUMENT_TITLE = "Rapport commercial";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final DailyOperationLogRepository operationLogRepository;
    private final CommercialCockpitService cockpitService;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String commercialUsername) {
        var summary = cockpitService.summary(commercialUsername, startDate, endDate);
        DailyCommercialReport kpi = summary.activity() != null ? summary.activity() : new DailyCommercialReport();

        List<DailyOperationLog> operations = operationLogRepository.findByDateBetweenAndCommercialUsername(
                startDate, endDate, commercialUsername);
        Map<OperationType, List<DailyOperationLog>> grouped = operations.stream()
                .sorted(Comparator.comparing(DailyOperationLog::getTimestamp,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.groupingBy(DailyOperationLog::getType));

        DailyReportExportPdfDto dto = buildDto(startDate, endDate, commercialUsername, kpi, summary.line(), grouped);

        Context context = new Context();
        UnitPriceVisibility.apply(context);
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("report", dto);
        String html = templateEngine.process("daily-report-export", context);
        return pdfHtmlRenderer.htmlToPdf(html,
                PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE + " · " + commercialUsername),
                PdfHtmlRenderer.FooterStyle.MODERN);
    }

    DailyReportExportPdfDto buildDto(LocalDate startDate, LocalDate endDate, String commercialUsername,
            DailyCommercialReport kpi, CommercialReconciliationLineDto line,
            Map<OperationType, List<DailyOperationLog>> grouped) {
        NumberFormat fmt = NumberFormat.getInstance(Locale.FRANCE);

        List<DailyReportExportPdfDto.Section> sections = new ArrayList<>();
        addSection(sections, "Ventes à crédit", grouped.get(OperationType.CREDIT_SALES), fmt, true);
        addSection(sections, "Recouvrements", grouped.get(OperationType.CREDIT_COLLECTION), fmt, false);
        addSection(sections, "Collectes tontine", grouped.get(OperationType.TONTINE_COLLECTION), fmt, false);
        addSection(sections, "Livraisons tontine", grouped.get(OperationType.TONTINE_DELIVERY), fmt, false);
        addSection(sections, "Adhésions tontine", grouped.get(OperationType.TONTINE_MEMBER_ENROLLMENT), fmt, false);
        addSection(sections, "Nouveaux clients", grouped.get(OperationType.NEW_CLIENT), fmt, false);

        return DailyReportExportPdfDto.builder()
                .title(DOCUMENT_TITLE)
                .companyName(PdfDocumentIdentity.COMPANY_NAME)
                .startDate(startDate.format(DAY))
                .endDate(endDate.format(DAY))
                .periodLabel(periodLabel(startDate, endDate))
                .commercialUsername(commercialUsername)
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .statusLabel(statusLabel(line))
                .statusClass(statusClass(line))
                .creditToDeposit(line.creditToDeposit())
                .tontineToDeposit(line.tontineToDeposit())
                .newBalanceToDeposit(line.newBalanceToDeposit())
                .catchupEntered(line.catchupEntered())
                .cashDue(line.cashDue())
                .deposited(line.deposited())
                .surplus(line.surplus())
                .remaining(line.remaining())
                .historicalRemaining(line.historicalRemaining())
                .operationsCount(line.operationsCount())
                .distributionCount(count(kpi.getCreditSalesCount()))
                .distributionAmount(amount(kpi.getCreditSalesAmount()))
                .recoveryCount(count(kpi.getCollectionsCount()))
                .recoveryAmount(amount(kpi.getCollectionsAmount()))
                .newClientCount(count(kpi.getNewClientsCount()))
                .newClientBalance(amount(kpi.getNewAccountsBalance()))
                .tontineMemberCount(count(kpi.getTontineMembersCount()))
                .tontineCollectionCount(count(kpi.getTontineCollectionsCount()))
                .tontineCollectionAmount(amount(kpi.getTontineCollectionsAmount()))
                .tontineDeliveryCount(count(kpi.getTontineDeliveriesCount()))
                .tontineDeliveryAmount(amount(kpi.getTontineDeliveriesAmount()))
                .totalAdvancesAmount(amount(kpi.getTotalAdvancesAmount()))
                .totalReliquatGeneratedAmount(amount(kpi.getTotalReliquatGeneratedAmount()))
                .totalReliquatUsedAmount(amount(kpi.getTotalReliquatUsedAmount()))
                .tontineCatchupCount(count(kpi.getTontineCatchupCount()))
                .tontineCatchupAmount(amount(kpi.getTontineCatchupAmount()))
                .totalToPay(amount(kpi.getTotalAmountToDeposit()))
                .sections(sections)
                .build();
    }

    static String periodLabel(LocalDate start, LocalDate end) {
        if (start.equals(end)) {
            return "Journée du " + start.format(DAY);
        }
        return "Du " + start.format(DAY) + " au " + end.format(DAY);
    }

    static String statusLabel(CommercialReconciliationLineDto line) {
        return switch (line.status()) {
            case LATE -> "Reste à verser";
            case SURPLUS -> "Surplus versé";
            case UP_TO_DATE -> "À jour";
            case INACTIVE -> "Aucune activité";
        };
    }

    static String statusClass(CommercialReconciliationLineDto line) {
        return switch (line.status()) {
            case LATE -> "pill-amber";
            case SURPLUS -> "pill-navy";
            case UP_TO_DATE -> "pill-green";
            case INACTIVE -> "pill-grey";
        };
    }

    private void addSection(List<DailyReportExportPdfDto.Section> sections, String title,
            List<DailyOperationLog> ops, NumberFormat fmt, boolean distribution) {
        if (ops == null || ops.isEmpty()) {
            return;
        }
        List<DailyReportExportPdfDto.ItemRow> rows = new ArrayList<>();
        int index = 1;
        double total = 0.0;
        for (DailyOperationLog op : ops) {
            double value = op.getAmount() != null ? op.getAmount() : 0.0;
            total += value;
            rows.add(DailyReportExportPdfDto.ItemRow.builder()
                    .index(index++)
                    .time(op.getTimestamp() != null ? op.getTimestamp().format(TIME) : "")
                    .clientName(extractClientName(op.getDescription()))
                    .details(op.getReference() != null ? op.getReference() : "")
                    .amount(fmt.format(value))
                    .extra(distribution ? advanceInfo(op.getDescription()) : "")
                    .status("Sync")
                    .build());
        }
        sections.add(DailyReportExportPdfDto.Section.builder()
                .title(title)
                .total(fmt.format(total) + " FCFA")
                .showExtra(distribution)
                .rows(rows)
                .build());
    }

    private static String advanceInfo(String description) {
        if (description == null || !description.contains("Avance:")) {
            return "";
        }
        return description.substring(description.indexOf("Avance:") + "Avance:".length()).trim();
    }

    static String extractClientName(String description) {
        if (description == null) {
            return "";
        }
        for (String marker : List.of("Client:", "client")) {
            if (description.contains(marker)) {
                int start = description.indexOf(marker) + marker.length();
                int end = description.indexOf(",", start);
                if (end == -1) {
                    end = description.indexOf(")", start);
                }
                if (end == -1) {
                    end = description.length();
                }
                return description.substring(start, end).trim();
            }
        }
        return description.length() > 40 ? description.substring(0, 40) + "..." : description;
    }

    private static int count(Integer value) {
        return value != null ? value : 0;
    }

    private static double amount(Double value) {
        return value != null ? value : 0.0;
    }
}
