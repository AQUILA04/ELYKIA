package com.optimize.elykia.core.service;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.bi.CollectionTrendDto;
import com.optimize.elykia.core.dto.bi.OverdueAnalysisDto;
import com.optimize.elykia.core.dto.bi.OverdueRangeProjection;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class BiCollectionAnalyticsService {
    
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository timelineRepository;
    
    /**
     * Tendances des encaissements par jour - Partially optimized
     * Note: Still uses loop for daily calculation but reduces active credits loading
     */
    public List<CollectionTrendDto> getCollectionTrends(LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis();
        
        List<CollectionTrendDto> trends = new ArrayList<>();
        
        // Load active credits once instead of in loop
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
        
        long endTime = System.currentTimeMillis();
        log.debug("getCollectionTrends executed in {} ms for period {} to {}", (endTime - startTime), startDate, endDate);
        
        return trends;
    }
    
    /**
     * Analyse des retards par tranche - Optimized with native query
     */
    public List<OverdueAnalysisDto> getOverdueAnalysis() {
        long startTime = System.currentTimeMillis();
        
        // Use optimized native query instead of multiple Stream filter operations
        List<OverdueRangeProjection> projections = creditRepository.getOverdueAnalysis();
        
        // Calculate total overdue amount for percentage calculation
        Double totalOverdue = projections.stream()
            .mapToDouble(OverdueRangeProjection::getTotalAmount)
            .sum();
        
        List<OverdueAnalysisDto> result = projections.stream()
            .map(proj -> {
                Double percentage = totalOverdue > 0 ? (proj.getTotalAmount() / totalOverdue) * 100 : 0.0;
                return new OverdueAnalysisDto(proj.getRange(), proj.getCreditsCount(), proj.getTotalAmount(), percentage);
            })
            .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
        
        long endTime = System.currentTimeMillis();
        log.debug("getOverdueAnalysis executed in {} ms", (endTime - startTime));
        
        return result;
    }
    
    private OverdueAnalysisDto createOverdueDto(String range, List<Credit> credits, Double totalOverdue) {
        Double amount = credits.stream().mapToDouble(Credit::getTotalAmountRemaining).sum();
        Double percentage = totalOverdue > 0 ? (amount / totalOverdue) * 100 : 0.0;
        return new OverdueAnalysisDto(range, credits.size(), amount, percentage);
    }
}
