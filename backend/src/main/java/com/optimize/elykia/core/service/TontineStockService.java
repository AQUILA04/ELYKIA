package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.CreditArticles;
import com.optimize.elykia.core.entity.TontineStock;
import com.optimize.elykia.core.enumaration.StockOperation;
import com.optimize.elykia.core.repository.TontineStockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class TontineStockService extends GenericService<TontineStock, Long> {
    private final UserService userService;

    protected TontineStockService(TontineStockRepository repository,
                                  UserService userService) {
        super(repository);
        this.userService = userService;
    }

    public TontineStock updateArticleStock(CreditArticles creditArticles, String commercial, StockOperation stockOperation) {
        TontineStock tontineStock = getRepository().getArticleForCommercial(creditArticles.getArticlesId(), commercial);
        if (Objects.nonNull(tontineStock)) {
            if (StockOperation.ADD.equals(stockOperation)) {
                tontineStock.addQuantity(creditArticles.getQuantity());
            } else {
                tontineStock.removeQuantity(creditArticles.getQuantity());
            }
            return update(tontineStock);
        }
        return null;
    }

    @Transactional
    public void checkAvailabilityAndUpdateTontineStock(Collection<CreditArticles> creditArticles, String commercial) {
        List<String> unAvailableStock = new ArrayList<>();
        creditArticles.forEach(creditArticle -> {
            TontineStock tontineStock = getRepository().getArticleForCommercial(creditArticle.getArticlesId(), commercial);
            if (Objects.isNull(tontineStock) || tontineStock.getAvailableQuantity() < creditArticle.getQuantity()) {
                unAvailableStock.add(creditArticle.getArticles().getCommercialName());
            } else {
                updateArticleStock(creditArticle, commercial, StockOperation.REMOVE);
            }
        });

        if (!unAvailableStock.isEmpty()) {
            throw new CustomValidationException(String.format("L'article(s) %s n'est pas disponible(s) ou quantité insuffisante pour le stock du commercial", String.join(", ", unAvailableStock)));
        }
    }

    public List<TontineStock> getStock() {
        return getRepository()
                .findByCommercialAndYear(userService.getCurrentUser().getUsername(),
                        LocalDate.now().getYear())
                .stream()
                .filter(stock -> stock.getAvailableQuantity() > 0)
                .toList();
    }

    @Override
    public TontineStockRepository getRepository() {
        return (TontineStockRepository) super.getRepository();
    }
}
