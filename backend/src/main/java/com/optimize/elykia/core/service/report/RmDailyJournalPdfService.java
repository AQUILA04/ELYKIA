package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.dto.sale.RmDailyJournalPdfDto;
import com.optimize.elykia.core.dto.sale.RmDailyJournalPdfRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RmDailyJournalPdfService {

    static final String DOCUMENT_TITLE = "Rapport journalier";
    static final String STATUS_SYNCED = "Synchronisé";
    static final String STATUS_LOCAL = "Local";
    static final String STATUS_FAILED = "Échec";

    private static final DateTimeFormatter GENERATION_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    public byte[] generate(RmDailyJournalPdfRequest request, String operatorLabel) {
        RmDailyJournalPdfDto dto = buildDto(request, operatorLabel);
        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", dto);
        String html = templateEngine.process("rm-daily-journal", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    RmDailyJournalPdfDto buildDto(RmDailyJournalPdfRequest request, String operatorLabel) {
        List<RmDailyJournalPdfDto.Operation> rows = new ArrayList<>();
        List<RmDailyJournalPdfRequest.Operation> source = request.getOperations() == null
                ? List.of()
                : request.getOperations();
        for (RmDailyJournalPdfRequest.Operation operation : source) {
            if (operation == null) {
                continue;
            }
            rows.add(RmDailyJournalPdfDto.Operation.builder()
                    .operationType(blankToDash(operation.getOperationType()))
                    .dossier(blankToDash(operation.getDossier()))
                    .time(blankToDash(operation.getTime()))
                    .status(blankToDash(operation.getStatus()))
                    .detail(operation.getDetail() == null ? "" : operation.getDetail().trim())
                    .build());
        }
        return RmDailyJournalPdfDto.builder()
                .journalDate(request.getJournalDate().trim())
                .operatorLabel(operatorLabel == null || operatorLabel.isBlank() ? "Chef de recouvrement" : operatorLabel.trim())
                .generationDate(LocalDateTime.now().format(GENERATION_FORMAT))
                .operationCount(rows.size())
                .syncedCount(rows.stream().filter(row -> STATUS_SYNCED.equals(row.getStatus())).count())
                .localCount(rows.stream().filter(row -> STATUS_LOCAL.equals(row.getStatus())).count())
                .failedCount(rows.stream().filter(row -> STATUS_FAILED.equals(row.getStatus())).count())
                .operations(rows)
                .build();
    }

    private String blankToDash(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }
        return value.trim();
    }
}
