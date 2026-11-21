package com.optimize.elykia.core.service.report;


import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.UnitPriceVisibility;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.core.dto.report.cockpit.OperationTypeTotalDto;
import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.core.dto.DailyOperationExportPdfDto;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DailyOperationService {

    private final DailyOperationLogRepository repository;
    private final org.thymeleaf.TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOperation(String commercialUsername, OperationType type, Double amount, String reference,
            String description) {
        logOperation(commercialUsername, type, amount, reference, description, 0.0, 0.0);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOperation(String commercialUsername, OperationType type, Double amount, String reference,
            String description, Double reliquatGeneratedAmount, Double reliquatUsedAmount) {
        logOperation(commercialUsername, type, amount, reference, description, reliquatGeneratedAmount,
                reliquatUsedAmount, LocalDate.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOperation(String commercialUsername, OperationType type, Double amount, String reference,
            String description, Double reliquatGeneratedAmount, Double reliquatUsedAmount, LocalDate operationDate) {
        persistOperationLog(commercialUsername, type, amount, reference, description,
                reliquatGeneratedAmount, reliquatUsedAmount, operationDate);
    }

    /**
     * Même écriture que {@link #logOperation} mais dans la transaction appelante
     * (annulation de vente : rollback global si l'opération échoue ensuite).
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void logOperationInCurrentTransaction(String commercialUsername, OperationType type, Double amount,
            String reference, String description, Double reliquatGeneratedAmount, Double reliquatUsedAmount,
            LocalDate operationDate) {
        persistOperationLog(commercialUsername, type, amount, reference, description,
                reliquatGeneratedAmount, reliquatUsedAmount, operationDate);
    }

    private void persistOperationLog(String commercialUsername, OperationType type, Double amount, String reference,
            String description, Double reliquatGeneratedAmount, Double reliquatUsedAmount, LocalDate operationDate) {
        LocalDate date = operationDate != null ? operationDate : LocalDate.now();
        DailyOperationLog log = new DailyOperationLog(
                date,
                commercialUsername,
                LocalDateTime.now(),
                type,
                amount,
                reference,
                description);
        log.setReliquatGeneratedAmount(reliquatGeneratedAmount != null ? reliquatGeneratedAmount : 0.0);
        log.setReliquatUsedAmount(reliquatUsedAmount != null ? reliquatUsedAmount : 0.0);
        repository.save(log);
    }

    /** Totaux par type (une requête groupée), le plus gros montant d'abord. */
    @Transactional(readOnly = true)
    public List<OperationTypeTotalDto> getTotalsByType(LocalDate startDate, LocalDate endDate,
            String commercialUsername) {
        List<Object[]> rows = commercialUsername == null
                ? repository.sumByType(startDate, endDate)
                : repository.sumByTypeForCommercial(startDate, endDate, commercialUsername);
        return rows.stream()
                .filter(row -> row != null && row.length >= 3 && row[0] != null)
                .map(row -> new OperationTypeTotalDto(
                        (OperationType) row[0],
                        row[1] != null ? ((Number) row[1]).longValue() : 0L,
                        row[2] != null ? ((Number) row[2]).doubleValue() : 0.0))
                .sorted(java.util.Comparator.comparingDouble(OperationTypeTotalDto::amount).reversed())
                .toList();
    }

    public Page<DailyOperationLog> getOperations(LocalDate startDate, LocalDate endDate, String commercialUsername,
            Pageable pageable) {
        return getOperations(startDate, endDate, commercialUsername, null, pageable);
    }

    public Page<DailyOperationLog> getOperations(LocalDate startDate, LocalDate endDate, String commercialUsername,
            OperationType type, Pageable pageable) {
        if (commercialUsername != null) {
            if (startDate != null && endDate != null) {
                if (type != null) {
                    return repository.findByDateBetweenAndCommercialUsernameAndType(startDate, endDate,
                            commercialUsername, type, pageable);
                }
                return repository.findByDateBetweenAndCommercialUsername(startDate, endDate, commercialUsername,
                        pageable);
            } else if (startDate != null) {
                if (type != null) {
                    return repository.findByDateAndCommercialUsernameAndType(startDate, commercialUsername, type,
                            pageable);
                }
                return repository.findByDateAndCommercialUsername(startDate, commercialUsername, pageable);
            }
        } else {
            if (startDate != null && endDate != null) {
                if (type != null) {
                    return repository.findByDateBetweenAndType(startDate, endDate, type, pageable);
                }
                return repository.findByDateBetween(startDate, endDate, pageable);
            }
        }
        return Page.empty();
    }

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String commercialUsername) {
        return generatePdfExport(startDate, endDate, commercialUsername, null);
    }

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String commercialUsername,
            OperationType type) {
        List<DailyOperationLog> operations;

        if (commercialUsername != null && !commercialUsername.isEmpty()) {
            if (type != null) {
                operations = repository.findByDateBetweenAndCommercialUsernameAndType(startDate, endDate,
                        commercialUsername, type);
            } else {
                operations = repository.findByDateBetweenAndCommercialUsername(startDate, endDate, commercialUsername);
            }
        } else if (type != null) {
            operations = repository.findByDateBetweenAndType(startDate, endDate, type);
        } else {
            operations = repository.findByDateBetween(startDate, endDate);
        }

        operations = operations.stream()
                .sorted(java.util.Comparator.comparing(DailyOperationLog::getTimestamp,
                        java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .toList();
        DailyOperationExportPdfDto contextDto = buildExportDto(startDate, endDate, commercialUsername, type, operations);

        org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
        UnitPriceVisibility.apply(context);
        PdfDocumentIdentity.applyTo(context, JOURNAL_TITLE);
        context.setVariable("context", contextDto);

        String html = templateEngine.process("daily-operation-export", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(JOURNAL_TITLE),
                PdfHtmlRenderer.FooterStyle.MODERN);
    }

    static final String JOURNAL_TITLE = "Journal des opérations";

    DailyOperationExportPdfDto buildExportDto(LocalDate startDate, LocalDate endDate, String commercialUsername,
            OperationType type, List<DailyOperationLog> operations) {
        java.time.format.DateTimeFormatter day = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        java.time.format.DateTimeFormatter time = java.time.format.DateTimeFormatter.ofPattern("dd/MM HH:mm");
        java.util.Map<OperationType, double[]> byType = new java.util.EnumMap<>(OperationType.class);
        List<DailyOperationExportPdfDto.Row> rows = new java.util.ArrayList<>();
        double total = 0.0;
        for (DailyOperationLog op : operations) {
            double amount = op.getAmount() != null ? op.getAmount() : 0.0;
            total += amount;
            if (op.getType() != null) {
                double[] bucket = byType.computeIfAbsent(op.getType(), key -> new double[2]);
                bucket[0] += 1;
                bucket[1] += amount;
            }
            rows.add(DailyOperationExportPdfDto.Row.builder()
                    .time(op.getTimestamp() != null ? op.getTimestamp().format(time) : "")
                    .commercial(op.getCommercialUsername())
                    .typeLabel(com.optimize.elykia.core.util.OperationTypeLabels.label(op.getType()))
                    .pill(com.optimize.elykia.core.util.OperationTypeLabels.pill(op.getType()))
                    .reference(op.getReference())
                    .description(op.getDescription())
                    .amount(amount)
                    .build());
        }
        List<DailyOperationExportPdfDto.TypeTotal> totals = byType.entrySet().stream()
                .map(entry -> DailyOperationExportPdfDto.TypeTotal.builder()
                        .label(com.optimize.elykia.core.util.OperationTypeLabels.label(entry.getKey()))
                        .pill(com.optimize.elykia.core.util.OperationTypeLabels.pill(entry.getKey()))
                        .count((long) entry.getValue()[0])
                        .amount(entry.getValue()[1])
                        .build())
                .sorted(java.util.Comparator.comparingDouble(DailyOperationExportPdfDto.TypeTotal::getAmount).reversed())
                .toList();
        String start = startDate != null ? startDate.format(day) : "";
        String end = endDate != null ? endDate.format(day) : "";
        return DailyOperationExportPdfDto.builder()
                .title(JOURNAL_TITLE)
                .startDate(start)
                .endDate(end)
                .periodLabel(start.equals(end) ? "Journée du " + start : "Du " + start + " au " + end)
                .collector(commercialUsername != null && !commercialUsername.isBlank() ? commercialUsername : "Toute l'équipe")
                .typeLabel(type != null ? com.optimize.elykia.core.util.OperationTypeLabels.label(type) : "Tous les types")
                .generationDate(LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .operationsCount(rows.size())
                .totalAmount(total)
                .totals(totals)
                .rows(rows)
                .build();
    }
}
