package com.optimize.elykia.core.service;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.bi.CollectionTrendDto;
import com.optimize.elykia.core.dto.bi.OverdueAnalysisDto;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiCollectionAnalyticsService {
    
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository timelineRepository;
    
    /**
     * Tendances des encaissements par jour
     */
    public List<CollectionTrendDto> getCollectionTrends(LocalDate startDate, LocalDate endDate) {
        List<CollectionTrendDto> trends = new ArrayList<>();
        List<Credit> activeCredits = creditRepository.findByStatusAndClientType(CreditStatus.INPROGRESS, ClientType.CLIENT);
        Double expectedDaily = activeCredits.stream().mapToDouble(Credit::getDailyStake).sum();
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            LocalDateTime dayStart = currentDate.atStartOfDay();
            LocalDateTime dayEnd = currentDate.atTime(23, 59, 59);
            
            Double collected = timelineRepository.sumAmountByDateAndCreditType(dayStart, dayEnd, "CREDIT");
            if (collected == null) collected = 0.0;
            
            Double collectionRate = expectedDaily > 0 ? (collected / expectedDaily) * 100 : 0.0;
            
            trends.add(new CollectionTrendDto(
                currentDate,
                collected,
                expectedDaily,
                collectionRate,
                0 // TODO: compter les paiements
            ));
            
            currentDate = currentDate.plusDays(1);
        }
        
        return trends;
    }
    
    /**
     * Analyse des retards par tranche
     */
    public List<OverdueAnalysisDto> getOverdueAnalysis() {
        List<Credit> activeCredits = creditRepository.findByStatusAndClientType(CreditStatus.INPROGRESS, ClientType.CLIENT);
        LocalDate now = LocalDate.now();
        
        List<OverdueAnalysisDto> analysis = new ArrayList<>();
        
        // 0-7 jours
        List<Credit> range1 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && 
                        c.getExpectedEndDate().isBefore(now) &&
                        ChronoUnit.DAYS.between(c.getExpectedEndDate(), now) <= 7)
            .toList();
        
        // 8-15 jours
        List<Credit> range2 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && 
                        c.getExpectedEndDate().isBefore(now) &&
                        ChronoUnit.DAYS.between(c.getExpectedEndDate(), now) > 7 &&
                        ChronoUnit.DAYS.between(c.getExpectedEndDate(), now) <= 15)
            .toList();
        
        // 16-30 jours
        List<Credit> range3 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && 
                        c.getExpectedEndDate().isBefore(now) &&
                        ChronoUnit.DAYS.between(c.getExpectedEndDate(), now) > 15 &&
                        ChronoUnit.DAYS.between(c.getExpectedEndDate(), now) <= 30)
            .toList();
        
        // > 30 jours
        List<Credit> range4 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && 
                        c.getExpectedEndDate().isBefore(now) &&
                        ChronoUnit.DAYS.between(c.getExpectedEndDate(), now) > 30)
            .toList();
        
        Double totalOverdue = range1.stream().mapToDouble(Credit::getTotalAmountRemaining).sum() +
                             range2.stream().mapToDouble(Credit::getTotalAmountRemaining).sum() +
                             range3.stream().mapToDouble(Credit::getTotalAmountRemaining).sum() +
                             range4.stream().mapToDouble(Credit::getTotalAmountRemaining).sum();
        
        analysis.add(createOverdueDto("0-7 jours", range1, totalOverdue));
        analysis.add(createOverdueDto("8-15 jours", range2, totalOverdue));
        analysis.add(createOverdueDto("16-30 jours", range3, totalOverdue));
        analysis.add(createOverdueDto(">30 jours", range4, totalOverdue));
        
        return analysis;
    }
    
    private OverdueAnalysisDto createOverdueDto(String range, List<Credit> credits, Double totalOverdue) {
        Double amount = credits.stream().mapToDouble(Credit::getTotalAmountRemaining).sum();
        Double percentage = totalOverdue > 0 ? (amount / totalOverdue) * 100 : 0.0;
        return new OverdueAnalysisDto(range, credits.size(), amount, percentage);
    }
}
