package com.optimize.elykia.core.service.report;

import com.itextpdf.html2pdf.HtmlConverter;
import com.optimize.elykia.core.dto.sale.CommercialRemittanceDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.entity.sale.RecoveryManagerOperation;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecoveryManagerReportPdfService {

    private final RecoveryManagerOperationRepository operationRepository;
    private final TemplateEngine templateEngine;

    public byte[] generatePdf(LocalDate startDate, LocalDate endDate, String recoveryManagerUsername, String commercialUsername) {
        RecoveryManagerReportSummaryDto summary = buildSummary(startDate, endDate, recoveryManagerUsername, commercialUsername);

        Page<RecoveryManagerOperation> operationsPage = operationRepository
                .findByFilters(startDate, endDate, recoveryManagerUsername, commercialUsername, PageRequest.of(0, 1000, Sort.by("operationDate").descending()));

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        Context context = new Context();
        context.setVariable("summary", summary);
        context.setVariable("operations", operationsPage.getContent().stream()
                .map(op -> new OperationPdfRow(
                        op.getOperationDate() != null ? op.getOperationDate().format(dateFmt) : "",
                        op.getCreditReference() != null ? op.getCreditReference() : "",
                        op.getClientName() != null ? op.getClientName() : "",
                        op.getCommercialUsername() != null ? op.getCommercialUsername() : "",
                        op.getAmountCollected() != null ? op.getAmountCollected() : 0.0,
                        Boolean.TRUE.equals(op.getIsPartial()) ? "Partiel" : "Total"
                ))
                .toList());
        context.setVariable("startDate", startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        context.setVariable("endDate", endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        context.setVariable("recoveryManagerUsername", recoveryManagerUsername != null ? recoveryManagerUsername : "Tous");
        context.setVariable("generationDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        context.setVariable("fmt", NumberFormat.getInstance(Locale.FRANCE));

        String html = templateEngine.process("recovery-manager-report-export", context);

        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    public record OperationPdfRow(String date, String creditReference, String clientName,
                                   String commercialUsername, Double amount, String type) {}

    private RecoveryManagerReportSummaryDto buildSummary(LocalDate startDate, LocalDate endDate, String recoveryManagerUsername, String commercialUsername) {
        Double totalCollected = operationRepository.sumAmountCollected(startDate, endDate, recoveryManagerUsername, commercialUsername);
        Integer totalOps = operationRepository.countOperations(startDate, endDate, recoveryManagerUsername, commercialUsername);
        Integer commercialsCount = operationRepository.countDistinctCommercials(startDate, endDate, recoveryManagerUsername, commercialUsername);

        List<Object[]> remittanceData = operationRepository.findRemittanceByCommercial(startDate, endDate, recoveryManagerUsername, commercialUsername);
        List<CommercialRemittanceDto> remittances = remittanceData.stream()
                .map(row -> CommercialRemittanceDto.builder()
                        .commercialUsername((String) row[0])
                        .operationsCount(((Number) row[1]).intValue())
                        .totalToRemit(((Number) row[2]).doubleValue())
                        .build())
                .toList();

        return RecoveryManagerReportSummaryDto.builder()
                .totalAmountCollected(totalCollected != null ? totalCollected : 0.0)
                .totalOperationsCount(totalOps != null ? totalOps : 0)
                .commercialsCount(commercialsCount != null ? commercialsCount : 0)
                .remittanceByCommercial(remittances)
                .build();
    }
}
