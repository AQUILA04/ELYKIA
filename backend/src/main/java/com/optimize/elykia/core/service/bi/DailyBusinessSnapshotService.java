package com.optimize.elykia.core.service.bi;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.bi.DailyBusinessSnapshot;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyBusinessSnapshotRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
     * Génère le snapshot pour une date donnée
     */
    public DailyBusinessSnapshot generateSnapshot(LocalDate date) {
        DailyBusinessSnapshot snapshot = snapshotRepository.findBySnapshotDate(date)
            .orElse(new DailyBusinessSnapshot());
        
        snapshot.setSnapshotDate(date);
        
        // Ventes du jour
        List<Credit> dailyCredits = creditRepository.findByAccountingDate(date);
        snapshot.setNewCreditsCount(dailyCredits.size());
        snapshot.setNewCreditsTotalAmount(
            dailyCredits.stream().mapToDouble(Credit::getTotalAmount).sum()
        );
        snapshot.setNewCreditsProfit(
            dailyCredits.stream()
                .mapToDouble(c -> c.getTotalAmount() - c.getTotalPurchase())
                .sum()
        );
        
        // Collections du jour
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59);
        Double dailyCollections = timelineRepository.sumAmountByDate(startOfDay, endOfDay);
        snapshot.setDailyCollections(dailyCollections != null ? dailyCollections : 0.0);
        
        // Stock
        List<Articles> allArticles = articlesService.getAll();
        snapshot.setTotalStockValue(
            allArticles.stream()
                .mapToDouble(a -> a.getStockQuantity() * a.getPurchasePrice())
                .sum()
        );
        snapshot.setOutOfStockItemsCount(
            (int) allArticles.stream().filter(a -> a.getStockQuantity() == 0).count()
        );
        snapshot.setLowStockItemsCount(
            (int) allArticles.stream()
                .filter(a -> a.getReorderPoint() != null && a.getStockQuantity() <= a.getReorderPoint())
                .count()
        );
        
        // Portefeuille
        List<Credit> activeCredits = creditRepository.findByStatusAndClientType(CreditStatus.INPROGRESS, ClientType.CLIENT);
        snapshot.setActiveCreditsCount(activeCredits.size());
        snapshot.setTotalOutstandingAmount(
            activeCredits.stream().mapToDouble(Credit::getTotalAmountRemaining).sum()
        );
        snapshot.setTotalOverdueAmount(
            activeCredits.stream()
                .filter(c -> c.getExpectedEndDate() != null && c.getExpectedEndDate().isBefore(date))
                .mapToDouble(Credit::getTotalAmountRemaining)
                .sum()
        );
        
        // Collection attendue
        snapshot.setExpectedDailyCollection(
            activeCredits.stream().mapToDouble(Credit::getDailyStake).sum()
        );
        
        return snapshotRepository.save(snapshot);
    }
    
    /**
     * Génère le snapshot pour aujourd'hui
     */
    public DailyBusinessSnapshot generateTodaySnapshot() {
        return generateSnapshot(LocalDate.now());
    }
}
