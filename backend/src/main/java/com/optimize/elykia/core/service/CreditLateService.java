package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.CreditLateSummaryDTO;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.LateType;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CreditLateService {

    private final CreditRepository creditRepository;

    public List<CreditLateDTO> getLateCredits(String collector) {
        List<Credit> credits;
        if (collector != null && !collector.isBlank()) {
            credits = creditRepository.findLateCreditsByCollector(collector);
        } else {
            credits = creditRepository.findLateCredits();
        }

        LocalDate today = LocalDate.now();

        return credits.stream()
                .map(c -> buildLateDTO(c, today))
                .filter(dto -> dto.getLateType() != null)
                .sorted(Comparator
                        .comparing((CreditLateDTO d) -> d.getLateType() == LateType.DELAI ? 0 : 1)
                        .thenComparing(d -> -Math.max(d.getLateDaysDelai(), d.getLateDaysEcheance()))
                )
                .collect(Collectors.toList());
    }

    public CreditLateSummaryDTO getSummary(String collector) {
        List<CreditLateDTO> lates = getLateCredits(collector);

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
