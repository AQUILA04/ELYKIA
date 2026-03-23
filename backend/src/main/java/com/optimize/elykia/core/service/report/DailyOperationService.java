package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.core.dto.DailyOperationExportPdfDto;
import com.optimize.elykia.core.enumaration.OperationType;
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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOperation(String commercialUsername, OperationType type, Double amount, String reference,
            String description) {
        DailyOperationLog log = new DailyOperationLog(
                LocalDate.now(),
                commercialUsername,
                LocalDateTime.now(),
                type,
                amount,
                reference,
                description);
        repository.save(log);
    }

    public Page<DailyOperationLog> getOperations(LocalDate startDate, LocalDate endDate, String commercialUsername,
            Pageable pageable) {
        if (commercialUsername != null) {
            if (startDate != null && endDate != null) {
                return ((DailyOperationLogRepository) repository).findByDateBetweenAndCommercialUsername(startDate,
                        endDate,
                        commercialUsername, pageable);
            } else if (startDate != null) {
                return ((DailyOperationLogRepository) repository).findByDateAndCommercialUsername(startDate,
                        commercialUsername, pageable);
            }
        } else {
            if (startDate != null && endDate != null) {
                return ((DailyOperationLogRepository) repository).findByDateBetween(startDate, endDate, pageable);
            }
        }
        return Page.empty();
    }

    public byte[] generatePdfExport(LocalDate startDate, LocalDate endDate, String commercialUsername) {
        List<DailyOperationLog> operations;

        if (commercialUsername != null && !commercialUsername.isEmpty()) {
            operations = ((DailyOperationLogRepository) repository).findByDateBetweenAndCommercialUsername(startDate,
                    endDate, commercialUsername);
        } else {
            operations = ((DailyOperationLogRepository) repository).findByDateBetween(startDate, endDate);
        }

        Double totalAmount = operations.stream().mapToDouble(DailyOperationLog::getAmount).sum();

        DailyOperationExportPdfDto contextDto = DailyOperationExportPdfDto.builder()
                .title("Journal des Opérations")
                .startDate(startDate != null ? startDate.toString() : "Début")
                .endDate(endDate != null ? endDate.toString() : "Fin")
                .collector(commercialUsername != null ? commercialUsername : "Tous")
                .generationDate(
                        LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .operations(operations)
                .totalAmount(totalAmount)
                .build();

        org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
        context.setVariable("context", contextDto);

        String html = templateEngine.process("daily-operation-export", context);

        java.io.ByteArrayOutputStream target = new java.io.ByteArrayOutputStream();
        com.itextpdf.html2pdf.HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }
}
