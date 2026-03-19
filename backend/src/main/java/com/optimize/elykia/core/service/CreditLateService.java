package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.CreditLateSummaryDTO;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.LateType;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.itextpdf.html2pdf.HtmlConverter;
import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
public class CreditLateService {

    private final CreditRepository creditRepository;
    private final TemplateEngine templateEngine;

    public List<CreditLateDTO> getLateCredits(String collector, Integer month) {
        List<Credit> credits;
        if (collector != null && !collector.isBlank()) {
            credits = creditRepository.findLateCreditsByCollector(collector);
        } else {
            credits = creditRepository.findLateCredits();
        }

        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();

        return credits.stream()
                .filter(c -> {
                    if (month == null) return true;
                    if (c.getExpectedEndDate() == null) return false;
                    return c.getExpectedEndDate().getMonthValue() == month && c.getExpectedEndDate().getYear() == currentYear;
                })
                .map(c -> buildLateDTO(c, today))
                .filter(dto -> dto.getLateType() != null)
                .sorted(Comparator
                        .comparing((CreditLateDTO d) -> d.getLateType() == LateType.DELAI ? 0 : 1)
                        .thenComparing(d -> -Math.max(d.getLateDaysDelai(), d.getLateDaysEcheance()))
                )
                .collect(Collectors.toList());
    }

    public CreditLateSummaryDTO getSummary(String collector, Integer month) {
        List<CreditLateDTO> lates = getLateCredits(collector, month);

        long totalLate     = lates.size();
        long totalDelai    = lates.stream().filter(d -> d.getLateType() == LateType.DELAI).count();
        long totalEcheance = lates.stream().filter(d -> d.getLateType() == LateType.ECHEANCE).count();
        double totalDu     = lates.stream().mapToDouble(CreditLateDTO::getTotalAmountRemaining).sum();

        return CreditLateSummaryDTO.builder()
                .totalLate(totalLate)
                .totalDelai(totalDelai)
                .totalEcheance(totalEcheance)
                .totalAmountRemaining(totalDu)
                .build();
    }
    
    public List<String> getLateCollectors() {
        return creditRepository.findLateCreditsCollectors();
    }

    public byte[] generatePdfExport(String collector, Integer month, String lateType) {
        List<CreditLateDTO> credits = getLateCredits(collector, month);
        
        if (lateType != null && !lateType.equals("all")) {
            LateType typeEnum = LateType.valueOf(lateType);
            credits = credits.stream()
                    .filter(c -> c.getLateType() == typeEnum)
                    .collect(Collectors.toList());
        }

        long totalAmountRemaining = credits.stream().mapToLong(c -> c.getTotalAmountRemaining() != null ? c.getTotalAmountRemaining().longValue() : 0L).sum();

        Context context = new Context();
        context.setVariable("credits", credits);
        context.setVariable("collectorName", collector != null && !collector.isBlank() ? collector : "Tous");
        context.setVariable("month", month != null ? String.format("%02d/%d", month, LocalDate.now().getYear()) : "Tous");
        context.setVariable("generationDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        context.setVariable("totalAmountRemaining", totalAmountRemaining);
        context.setVariable("lateType", lateType != null && lateType.equals("DELAI") ? "Retard délai" : (lateType != null && lateType.equals("ECHEANCE") ? "Retard échéance" : "Tous"));
        
        String html = templateEngine.process("credit-late-export", context);

        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    private CreditLateDTO buildLateDTO(Credit credit, LocalDate today) {
        int lateDaysDelai = 0;
        boolean isLateDelai = false;

        if (credit.getExpectedEndDate() != null && today.isAfter(credit.getExpectedEndDate())) {
            lateDaysDelai = (int) ChronoUnit.DAYS.between(credit.getExpectedEndDate(), today);
            isLateDelai   = true;
        }

        int lateDaysEcheance = 0;
        boolean isLateEcheance = false;

        if (credit.getBeginDate() != null && credit.getDailyStake() != null && credit.getDailyStake() > 0) {
            long totalDuration = credit.getExpectedEndDate() != null
                    ? ChronoUnit.DAYS.between(credit.getBeginDate(), credit.getExpectedEndDate())
                    : Long.MAX_VALUE;

            long rawElapsed    = ChronoUnit.DAYS.between(credit.getBeginDate(), today);
            long elapsedDays   = Math.min(rawElapsed, totalDuration);

            long paidDays      = (long) Math.floor((credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0.0) / credit.getDailyStake());
            long lateEcheance  = Math.max(0L, elapsedDays - paidDays);

            if (lateEcheance > 0) {
                lateDaysEcheance = (int) lateEcheance;
                isLateEcheance   = true;
            }
        }

        LateType lateType = null;
        if (isLateDelai) {
            lateType = LateType.DELAI;
        } else if (isLateEcheance) {
            lateType = LateType.ECHEANCE;
        }

        return CreditLateDTO.builder()
                .id(credit.getId())
                .reference(credit.getReference())
                .clientName(credit.getClient() != null
                        ? credit.getClient().getLastname() + " " + credit.getClient().getFirstname()
                        : "—")
                .clientPhone(credit.getClient() != null ? credit.getClient().getPhone() : null)
                .collector(credit.getCollector())
                .totalAmount(credit.getTotalAmount())
                .totalAmountPaid(credit.getTotalAmountPaid())
                .totalAmountRemaining(credit.getTotalAmountRemaining())
                .dailyStake(credit.getDailyStake())
                .beginDate(credit.getBeginDate())
                .expectedEndDate(credit.getExpectedEndDate())
                .remainingDaysCount(credit.getRemainingDaysCount())
                .lateDaysDelai(lateDaysDelai)
                .lateDaysEcheance(lateDaysEcheance)
                .lateType(lateType)
                .status(credit.getStatus())
                .build();
    }
}
