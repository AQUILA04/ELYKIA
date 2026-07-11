package com.optimize.elykia.core.service.bi;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.bi.PortfolioMetricsProjection;
import com.optimize.elykia.core.dto.bi.SalesMetricsProjection;
import com.optimize.elykia.core.entity.bi.DailyBusinessSnapshot;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyBusinessSnapshotRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@Transactional
public class DailyBusinessSnapshotService extends GenericService<DailyBusinessSnapshot, Long> {
    
    private final DailyBusinessSnapshotRepository snapshotRepository;
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository timelineRepository;
    private final ArticlesService articlesService;

    public DailyBusinessSnapshotService(DailyBusinessSnapshotRepository repository,
                                        DailyBusinessSnapshotRepository snapshotRepository,
                                        CreditRepository creditRepository,
                                        CreditTimelineRepository timelineRepository,
                                        ArticlesService articlesService) {
        super(repository);
        this.snapshotRepository = snapshotRepository;
        this.creditRepository = creditRepository;
        this.timelineRepository = timelineRepository;
        this.articlesService = articlesService;
    }

    /**
     * Génère le snapshot pour une date donnée (agrégations SQL, sans charger tout le portefeuille en mémoire).
     */
    public DailyBusinessSnapshot generateSnapshot(LocalDate date) {
        DailyBusinessSnapshot snapshot = snapshotRepository.findBySnapshotDate(date)
            .orElse(new DailyBusinessSnapshot());
        
        snapshot.setSnapshotDate(date);
        
        SalesMetricsProjection dailySales = creditRepository.getDailySalesMetricsForAccountingDate(date);
        snapshot.setNewCreditsCount(dailySales.getSalesCount() != null ? dailySales.getSalesCount() : 0);
        snapshot.setNewCreditsTotalAmount(dailySales.getTotalAmount() != null ? dailySales.getTotalAmount() : 0.0);
        snapshot.setNewCreditsProfit(dailySales.getTotalProfit() != null ? dailySales.getTotalProfit() : 0.0);
        
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59);
        Double dailyCollections = timelineRepository.sumAmountByDate(startOfDay, endOfDay);
        snapshot.setDailyCollections(dailyCollections != null ? dailyCollections : 0.0);
        
        Map<String, Double> stockValues = articlesService.getDetailedStockValues();
        snapshot.setTotalStockValue(stockValues.getOrDefault("purchaseTotal", 0.0));
        snapshot.setOutOfStockItemsCount((int) articlesService.getRepository().countByStockQuantityEquals(0));
        snapshot.setLowStockItemsCount(
            (int) articlesService.getRepository().countByStockQuantityLessThanEqualAndStockQuantityGreaterThan(6, 0)
        );
        
        PortfolioMetricsProjection portfolio = creditRepository.getPortfolioMetricsAsOf(date);
        snapshot.setActiveCreditsCount(portfolio.getActiveCount() != null ? portfolio.getActiveCount() : 0);
        snapshot.setTotalOutstandingAmount(
            portfolio.getTotalOutstanding() != null ? portfolio.getTotalOutstanding() : 0.0
        );
        snapshot.setTotalOverdueAmount(
            portfolio.getTotalOverdue() != null ? portfolio.getTotalOverdue() : 0.0
        );
        
        Double expectedCollection = creditRepository.sumExpectedDailyCollection();
        snapshot.setExpectedDailyCollection(expectedCollection != null ? expectedCollection : 0.0);
        
        return snapshotRepository.save(snapshot);
    }
    
    /**
     * Génère le snapshot pour aujourd'hui
     */
    public DailyBusinessSnapshot generateTodaySnapshot() {
        return generateSnapshot(LocalDate.now());
    }
}
