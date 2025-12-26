package com.optimize.elykia.core.service;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditArticles;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiSalesAnalyticsService {
    
    private final CreditRepository creditRepository;
    
    /**
     * Tendances des ventes par jour
     */
    public List<SalesTrendDto> getSalesTrends(LocalDate startDate, LocalDate endDate) {
        List<Credit> credits = creditRepository.findByAccountingDateBetweenAndClientType(startDate, endDate, ClientType.CLIENT);
        
        Map<LocalDate, List<Credit>> creditsByDate = credits.stream()
            .collect(Collectors.groupingBy(Credit::getAccountingDate));
        
        return creditsByDate.entrySet().stream()
            .map(entry -> {
                LocalDate date = entry.getKey();
                List<Credit> dayCredits = entry.getValue();
                
                Integer count = dayCredits.size();
                Double totalAmount = dayCredits.stream().mapToDouble(Credit::getTotalAmount).sum();
                Double totalProfit = dayCredits.stream()
                    .mapToDouble(c -> c.getTotalAmount() - c.getTotalPurchase())
                    .sum();
                Double avgAmount = count > 0 ? totalAmount / count : 0.0;
                
                return new SalesTrendDto(date, count, totalAmount, totalProfit, avgAmount);
            })
            .sorted(Comparator.comparing(SalesTrendDto::getDate))
            .collect(Collectors.toList());
    }
    
    /**
     * Performance des commerciaux
     */
    public List<CommercialPerformanceDto> getCommercialRanking(LocalDate startDate, LocalDate endDate) {
        List<String> collectors = creditRepository.findDistinctCollectors();
        
        return collectors.stream()
            .map(collector -> {
                List<Credit> credits = creditRepository
                    .findByCollectorAndAccountingDateBetweenAndClientType(collector, startDate, endDate, ClientType.CLIENT);
                
                CommercialPerformanceDto dto = new CommercialPerformanceDto();
                dto.setCollector(collector);
                dto.setPeriodStart(startDate);
                dto.setPeriodEnd(endDate);
                dto.setTotalSalesCount(credits.size());
                dto.setTotalSalesAmount(credits.stream().mapToDouble(Credit::getTotalAmount).sum());
                dto.setTotalProfit(credits.stream()
                    .mapToDouble(c -> c.getTotalAmount() - c.getTotalPurchase())
                    .sum());
                dto.setAverageSaleAmount(credits.size() > 0 ? dto.getTotalSalesAmount() / credits.size() : 0.0);
                dto.setTotalCollected(credits.stream().mapToDouble(Credit::getTotalAmountPaid).sum());
                dto.setCollectionRate(dto.getTotalSalesAmount() > 0 ? 
                    (dto.getTotalCollected() / dto.getTotalSalesAmount()) * 100 : 0.0);
                
                return dto;
            })
            .sorted(Comparator.comparing(CommercialPerformanceDto::getTotalSalesAmount).reversed())
            .collect(Collectors.toList());
    }
    
    /**
     * Performance des articles
     */
    public List<ArticlePerformanceDto> getArticlePerformance(LocalDate startDate, LocalDate endDate) {
        List<Credit> credits = creditRepository.findByAccountingDateBetweenAndClientType(startDate, endDate, ClientType.CLIENT);
        
        Map<Long, List<CreditArticles>> articleSales = new HashMap<>();
        credits.forEach(credit -> {
            if (credit.getArticles() != null) {
                credit.getArticles().forEach(ca -> {
                    articleSales.computeIfAbsent(ca.getArticles().getId(), k -> new ArrayList<>()).add(ca);
                });
            }
        });
        
        Double totalRevenue = credits.stream().mapToDouble(Credit::getTotalAmount).sum();
        
        return articleSales.entrySet().stream()
            .map(entry -> {
                Long articleId = entry.getKey();
                List<CreditArticles> sales = entry.getValue();
                
                if (sales.isEmpty()) return null;
                
                var firstArticle = sales.get(0).getArticles();
                Integer quantitySold = sales.stream().mapToInt(CreditArticles::getQuantity).sum();
                Double revenue = sales.stream()
                    .mapToDouble(ca -> ca.getQuantity() * ca.getUnitPrice())
                    .sum();
                Double profit = sales.stream()
                    .mapToDouble(ca -> ca.getQuantity() * (ca.getUnitPrice() - ca.getArticles().getPurchasePrice()))
                    .sum();
                Double profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0.0;
                Double contribution = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0.0;
                
                return new ArticlePerformanceDto(
                    articleId,
                    firstArticle.getCommercialName(),
                    firstArticle.getCategory(),
                    quantitySold,
                    revenue,
                    profit,
                    profitMargin,
                    firstArticle.getStockTurnoverRate(),
                    firstArticle.getStockQuantity(),
                    contribution
                );
            })
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(ArticlePerformanceDto::getTotalRevenue).reversed())
            .collect(Collectors.toList());
    }
}
