package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.dto.sale.CloseCreditsRequestDto;
import com.optimize.elykia.core.dto.sale.CreditCloseItemDto;
import com.optimize.elykia.core.dto.sale.CloseCreditsResponseDto;
import com.optimize.elykia.core.dto.sale.CreditCloseResultDto;
import com.optimize.elykia.core.dto.sale.CommercialRemittanceDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.RecoveryManagerOperation;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.event.RecoveryManagerCollectionEvent;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class RecoveryManagerService {

    private final CreditTimelineService creditTimelineService;
    private final CreditService creditService;
    private final RecoveryManagerOperationRepository operationRepository;
    private final ApplicationEventPublisher eventPublisher;

    public CloseCreditsResponseDto closeCredits(CloseCreditsRequestDto dto, String recoveryManagerUsername) {
        List<CreditCloseResultDto> successes = new ArrayList<>();
        List<CreditCloseResultDto> failures = new ArrayList<>();

        for (CreditCloseItemDto item : dto.getItems()) {
            processCreditItem(item, recoveryManagerUsername, successes, failures);
        }

        return CloseCreditsResponseDto.builder()
                .successes(successes)
                .failures(failures)
                .build();
    }

    private void processCreditItem(CreditCloseItemDto item, String recoveryManagerUsername,
                                   List<CreditCloseResultDto> successes, List<CreditCloseResultDto> failures) {
        try {
            Credit credit = creditService.getById(item.getCreditId());

            Optional<CreditCloseResultDto> validationError = validateCredit(credit, item);
            if (validationError.isPresent()) {
                failures.add(validationError.get());
                return;
            }

            RecoveryManagerOperation operation = processCreditClosure(credit, item, recoveryManagerUsername, credit.getCollector());
            successes.add(buildSuccessResult(credit, operation));

        } catch (Exception e) {
            log.error("Erreur lors de la clôture du crédit {}: {}", item.getCreditId(), e.getMessage(), e);
            failures.add(buildFailureResult(item.getCreditId(), "Erreur inattendue: " + e.getMessage()));
        }
    }

    private Optional<CreditCloseResultDto> validateCredit(Credit credit, CreditCloseItemDto item) {
        if (!CreditStatus.INPROGRESS.equals(credit.getStatus())) {
            return Optional.of(buildFailureResult(item.getCreditId(), credit.getReference(),
                    "Le crédit n'est pas en cours (INPROGRESS)"));
        }

        if (!isEndDateExceeded(credit)) {
            return Optional.of(buildFailureResult(item.getCreditId(), credit.getReference(),
                    "La date de fin du crédit n'est pas encore dépassée"));
        }

        if (operationRepository.existsByCreditIdAndOperationDate(item.getCreditId(), LocalDate.now())) {
            return Optional.of(buildFailureResult(item.getCreditId(), credit.getReference(),
                    "Opération déjà enregistrée aujourd'hui"));
        }

        if (Boolean.TRUE.equals(item.getIsPartial()) && !isValidPartialAmount(item, credit)) {
            return Optional.of(buildFailureResult(item.getCreditId(), credit.getReference(),
                    "Le montant partiel doit être > 0 et < " + credit.getTotalAmountRemaining()));
        }

        return Optional.empty();
    }

    private boolean isEndDateExceeded(Credit credit) {
        return credit.getExpectedEndDate() != null && credit.getExpectedEndDate().isBefore(LocalDate.now());
    }

    private boolean isValidPartialAmount(CreditCloseItemDto item, Credit credit) {
        return item.getAmount() > 0 && item.getAmount() < credit.getTotalAmountRemaining();
    }

    private RecoveryManagerOperation processCreditClosure(Credit credit,
                                                          CreditCloseItemDto item,
                                                          String recoveryManagerUsername,
                                                          String commercialUsername) {
        CreditTimelineDto timelineDto = buildTimelineDto(item, commercialUsername);
        var creditTimeline = creditTimelineService.makeDailyStake(timelineDto);

        RecoveryManagerOperation operation = buildOperation(credit, item, recoveryManagerUsername, creditTimeline.getId());
        operationRepository.save(operation);

        eventPublisher.publishEvent(new RecoveryManagerCollectionEvent(this, credit.getCollector(), item.getAmount()));

        return operation;
    }

    private CreditTimelineDto buildTimelineDto(CreditCloseItemDto item, String commercialUsername) {
        CreditTimelineDto timelineDto = new CreditTimelineDto();
        timelineDto.setCreditId(item.getCreditId());
        timelineDto.setAmount(item.getAmount());
        timelineDto.setCollector(commercialUsername);
        timelineDto.setNormalStake(Boolean.FALSE);
        timelineDto.setReference(generateTimelineReference());
        return timelineDto;
    }

    private String generateTimelineReference() {
        String yearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String randomHex = generateRandomHex(8);
        return String.format("RCV-%s-%s", yearMonth, randomHex);
    }

    private String generateRandomHex(int length) {
        SecureRandom random = new SecureRandom();
        StringBuilder hexString = new StringBuilder();
        for (int i = 0; i < length; i++) {
            hexString.append(String.format("%x", random.nextInt(16)));
        }
        return hexString.toString().toUpperCase();
    }

    private RecoveryManagerOperation buildOperation(Credit credit, CreditCloseItemDto item,
                                                    String recoveryManagerUsername, Long timelineId) {
        RecoveryManagerOperation operation = new RecoveryManagerOperation();
        operation.setRecoveryManagerUsername(recoveryManagerUsername);
        operation.setCommercialUsername(credit.getCollector());
        operation.setCreditId(item.getCreditId());
        operation.setCreditTimelineId(timelineId);
        operation.setAmountCollected(item.getAmount());
        operation.setIsPartial(item.getIsPartial());
        operation.setOriginalAmountRemaining(credit.getTotalAmountRemaining());
        operation.setOperationDate(LocalDate.now());
        operation.setReference(generateReference());
        operation.setClientName(getClientFullName(credit));
        operation.setCreditReference(credit.getReference());
        return operation;
    }

    private String getClientFullName(Credit credit) {
        return credit.getClient() != null ? credit.getClient().getFullName() : null;
    }

    private CreditCloseResultDto buildSuccessResult(Credit credit, RecoveryManagerOperation operation) {
        return CreditCloseResultDto.builder()
                .creditId(credit.getId())
                .creditReference(credit.getReference())
                .clientName(getClientFullName(credit))
                .operation(operation)
                .build();
    }

    private CreditCloseResultDto buildFailureResult(Long creditId, String creditReference, String errorMessage) {
        return CreditCloseResultDto.builder()
                .creditId(creditId)
                .creditReference(creditReference)
                .errorMessage(errorMessage)
                .build();
    }

    private CreditCloseResultDto buildFailureResult(Long creditId, String errorMessage) {
        return CreditCloseResultDto.builder()
                .creditId(creditId)
                .errorMessage(errorMessage)
                .build();
    }

    public Page<RecoveryManagerOperation> getOperations(LocalDate startDate, LocalDate endDate,
                                                         String recoveryManagerUsername, String commercialUsername, Pageable pageable) {
        return operationRepository.findByFilters(startDate, endDate, recoveryManagerUsername, commercialUsername, pageable);
    }

    public RecoveryManagerReportSummaryDto getReportSummary(LocalDate startDate, LocalDate endDate,
                                                             String recoveryManagerUsername, String commercialUsername) {
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

    private String generateReference() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = operationRepository.count();
        return String.format("RMO-%s-%03d", datePart, (count % 1000) + 1);
    }
}
