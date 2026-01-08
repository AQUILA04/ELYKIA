package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
@Transactional
public class StockReturnService extends GenericService<StockReturn, Long> {

    private final ArticlesService articlesService;
    private final CommercialMonthlyStockRepository monthlyStockRepository;

    public StockReturnService(StockReturnRepository repository,
                              ArticlesService articlesService,
                              CommercialMonthlyStockRepository monthlyStockRepository) {
        super(repository);
        this.articlesService = articlesService;
        this.monthlyStockRepository = monthlyStockRepository;
    }

    public StockReturn createReturn(StockReturn stockReturn) {
        stockReturn.setStatus(StockReturnStatus.CREATED);
        stockReturn.setReturnDate(LocalDate.now());
        return repository.save(stockReturn);
    }

    public StockReturn validateReturn(Long returnId) {
        StockReturn stockReturn = getById(returnId);
        if (stockReturn.getStatus() != StockReturnStatus.CREATED) {
            throw new CustomValidationException("Le retour a déjà été traité.");
        }

        // 1. Mettre à jour le stock mensuel du commercial
        updateCommercialMonthlyStock(stockReturn);

        // 2. Réintégrer les articles dans le stock magasin
        for (StockReturnItem item : stockReturn.getItems()) {
            Articles article = articlesService.getById(item.getArticle().getId());
            article.makeEntry(item.getQuantity());
            articlesService.update(article);
        }

        stockReturn.setStatus(StockReturnStatus.RECEIVED);
        return repository.save(stockReturn);
    }

    private void updateCommercialMonthlyStock(StockReturn stockReturn) {
        LocalDate date = LocalDate.now();
        int month = date.getMonthValue();
        int year = date.getYear();

        CommercialMonthlyStock monthlyStock = monthlyStockRepository
                .findByCollectorAndMonthAndYear(stockReturn.getCollector(), month, year)
                .orElseThrow(() -> new CustomValidationException("Aucun stock mensuel trouvé pour ce commercial."));

        for (StockReturnItem returnItem : stockReturn.getItems()) {
            Optional<CommercialMonthlyStockItem> existingItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(returnItem.getArticle().getId()))
                    .findFirst();

            if (existingItem.isPresent()) {
                CommercialMonthlyStockItem item = existingItem.get();
                // Vérifier que le commercial a assez de stock à retourner
                if (item.getQuantityRemaining() < returnItem.getQuantity()) {
                    throw new CustomValidationException("Quantité retournée supérieure au stock restant pour l'article : " + item.getArticle().getCommercialName());
                }
                item.setQuantityReturned(item.getQuantityReturned() + returnItem.getQuantity());
                item.updateRemaining();
            } else {
                throw new CustomValidationException("Article non trouvé dans le stock du commercial : " + returnItem.getArticle().getCommercialName());
            }
        }
        monthlyStockRepository.save(monthlyStock);
    }
}
