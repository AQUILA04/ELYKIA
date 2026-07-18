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
