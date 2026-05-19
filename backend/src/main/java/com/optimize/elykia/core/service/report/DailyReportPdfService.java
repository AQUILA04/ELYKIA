package com.optimize.elykia.core.service.report;

import com.itextpdf.html2pdf.HtmlConverter;
import com.optimize.elykia.core.dto.DailyReportExportPdfDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyReportPdfService {

    private final DailyOperationLogRepository operationLogRepository;
    private final DailyCommercialReportRepository reportRepository;
    private final TemplateEngine templateEngine;

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String commercialUsername) {
        List<DailyCommercialReport> reports = reportRepository.findAggregatedByDateBetweenAndCommercialUsername(
                commercialUsername, startDate, endDate);

        DailyCommercialReport kpi = reports.isEmpty() ? new DailyCommercialReport() : reports.get(0);

        List<DailyOperationLog> operations = operationLogRepository.findByDateBetweenAndCommercialUsername(
                startDate, endDate, commercialUsername);

        Map<OperationType, List<DailyOperationLog>> grouped = operations.stream()
                .collect(Collectors.groupingBy(DailyOperationLog::getType));

        DailyReportExportPdfDto dto = buildDto(startDate, endDate, commercialUsername, kpi, grouped);

        Context context = new Context();
        context.setVariable("report", dto);

        String html = templateEngine.process("daily-report-export", context);

        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    private DailyReportExportPdfDto buildDto(LocalDate startDate, LocalDate endDate,
                                             String commercialUsername, DailyCommercialReport kpi,
                                             Map<OperationType, List<DailyOperationLog>> grouped) {
        NumberFormat fmt = NumberFormat.getInstance(Locale.FRANCE);
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

        DailyReportExportPdfDto.DailyReportExportPdfDtoBuilder builder = DailyReportExportPdfDto.builder()
                .title("Rapport Journalier")
                .companyName("AMENOUVEVE - YAVEH")
                .startDate(startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .endDate(endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .commercialUsername(commercialUsername)
                .generationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .distributionCount(kpi.getCreditSalesCount() != null ? kpi.getCreditSalesCount() : 0)
                .distributionAmount(kpi.getCreditSalesAmount() != null ? kpi.getCreditSalesAmount() : 0.0)
                .recoveryCount(kpi.getCollectionsCount() != null ? kpi.getCollectionsCount() : 0)
                .recoveryAmount(kpi.getCollectionsAmount() != null ? kpi.getCollectionsAmount() : 0.0)
                .newClientCount(kpi.getNewClientsCount() != null ? kpi.getNewClientsCount() : 0)
                .newClientBalance(kpi.getNewAccountsBalance() != null ? kpi.getNewAccountsBalance() : 0.0)
                .tontineMemberCount(kpi.getTontineMembersCount() != null ? kpi.getTontineMembersCount() : 0)
                .tontineCollectionCount(kpi.getTontineCollectionsCount() != null ? kpi.getTontineCollectionsCount() : 0)
                .tontineCollectionAmount(kpi.getTontineCollectionsAmount() != null ? kpi.getTontineCollectionsAmount() : 0.0)
                .tontineDeliveryCount(kpi.getTontineDeliveriesCount() != null ? kpi.getTontineDeliveriesCount() : 0)
                .tontineDeliveryAmount(kpi.getTontineDeliveriesAmount() != null ? kpi.getTontineDeliveriesAmount() : 0.0)
                .totalAdvancesAmount(kpi.getTotalAdvancesAmount() != null ? kpi.getTotalAdvancesAmount() : 0.0)
                .totalReliquatGeneratedAmount(kpi.getTotalReliquatGeneratedAmount() != null ? kpi.getTotalReliquatGeneratedAmount() : 0.0)
                .totalReliquatUsedAmount(kpi.getTotalReliquatUsedAmount() != null ? kpi.getTotalReliquatUsedAmount() : 0.0)
                .totalToPay(kpi.getTotalAmountToDeposit() != null ? kpi.getTotalAmountToDeposit() : 0.0);

        List<DailyOperationLog> creditSales = grouped.getOrDefault(OperationType.CREDIT_SALES, Collections.emptyList());
        List<DailyOperationLog> collections = grouped.getOrDefault(OperationType.CREDIT_COLLECTION, Collections.emptyList());
        List<DailyOperationLog> newClients = grouped.getOrDefault(OperationType.NEW_CLIENT, Collections.emptyList());
        List<DailyOperationLog> tontineMembers = grouped.getOrDefault(OperationType.TONTINE_MEMBER_ENROLLMENT, Collections.emptyList());
        List<DailyOperationLog> tontineCollections = grouped.getOrDefault(OperationType.TONTINE_COLLECTION, Collections.emptyList());
        List<DailyOperationLog> tontineDeliveries = grouped.getOrDefault(OperationType.TONTINE_DELIVERY, Collections.emptyList());

        builder.distributions(mapItems(creditSales, fmt, timeFmt, true));
        builder.recoveries(mapItems(collections, fmt, timeFmt, false));
        builder.newClients(mapNewClientItems(newClients, fmt, timeFmt));
        builder.tontineMembers(mapItems(tontineMembers, fmt, timeFmt, false));
        builder.tontineCollections(mapItems(tontineCollections, fmt, timeFmt, false));
        builder.tontineDeliveries(mapItems(tontineDeliveries, fmt, timeFmt, false));

        return builder.build();
    }

    private List<DailyReportExportPdfDto.ItemRow> mapItems(List<DailyOperationLog> ops, NumberFormat fmt,
                                                           DateTimeFormatter timeFmt, boolean isDistribution) {
        List<DailyReportExportPdfDto.ItemRow> items = new ArrayList<>();
        int index = 1;
        for (DailyOperationLog op : ops) {
            String advanceInfo = "";
            if (isDistribution && op.getDescription() != null && op.getDescription().contains("Avance:")) {
                int idx = op.getDescription().indexOf("Avance:");
                advanceInfo = op.getDescription().substring(idx);
            }
            items.add(DailyReportExportPdfDto.ItemRow.builder()
                    .index(index++)
                    .time(op.getTimestamp() != null ? op.getTimestamp().format(timeFmt) : "")
                    .clientName(extractClientName(op.getDescription()))
                    .details(op.getReference() != null ? op.getReference() : "")
                    .amount(fmt.format(op.getAmount() != null ? op.getAmount() : 0.0) + " FCFA")
                    .extra(advanceInfo)
                    .status("Sync")
                    .build());
        }
        return items;
    }

    private List<DailyReportExportPdfDto.ItemRow> mapNewClientItems(List<DailyOperationLog> ops, NumberFormat fmt,
                                                                    DateTimeFormatter timeFmt) {
        List<DailyReportExportPdfDto.ItemRow> items = new ArrayList<>();
        int index = 1;
        for (DailyOperationLog op : ops) {
            items.add(DailyReportExportPdfDto.ItemRow.builder()
                    .index(index++)
                    .time(op.getTimestamp() != null ? op.getTimestamp().format(timeFmt) : "")
                    .clientName(extractClientName(op.getDescription()))
                    .details(op.getReference() != null ? op.getReference() : "")
                    .amount("0 FCFA")
                    .extra("")
                    .status("Sync")
                    .build());
        }
        return items;
    }

    private String extractClientName(String description) {
        if (description == null) return "";
        if (description.contains("Client:")) {
            int start = description.indexOf("Client:") + 7;
            int end = description.indexOf(",", start);
            if (end == -1) end = description.indexOf(")", start);
            if (end == -1) end = description.length();
            return description.substring(start, end).trim();
        }
        if (description.contains("client")) {
            int start = description.indexOf("client") + 6;
            int end = description.indexOf(",", start);
            if (end == -1) end = description.indexOf(")", start);
            if (end == -1) end = description.length();
            return description.substring(start, end).trim();
        }
        return description.length() > 40 ? description.substring(0, 40) + "..." : description;
    }
}
