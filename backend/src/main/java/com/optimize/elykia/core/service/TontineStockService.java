package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.StockOperation;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    public void processStockDelivery(StockTontineRequest request) {
        int year = request.getDeliveryDate().getYear();
        request.getItems().forEach(item -> {
            TontineStock stock = getRepository().findByArticleIdAndCommercialAndYear(
                    item.getArticle().getId(),
                    request.getCollector(),
                    year
            ).orElseGet(() -> {
                TontineStock newStock = new TontineStock();
                newStock.setCommercial(request.getCollector());
                newStock.setArticleId(item.getArticle().getId());
                newStock.setArticleName(item.getArticle().getCommercialName());
                newStock.setYear(year);
                newStock.setTotalQuantity(0);
                newStock.setAvailableQuantity(0);
                newStock.setDistributedQuantity(0);
                newStock.setQuantityReturned(0);
                newStock.setUnitPrice(item.getUnitPrice());
                newStock.setWeightedAverageUnitPrice(0.0);
                return newStock;
            });

            double currentTotalValue = stock.getAvailableQuantity() * stock.getWeightedAverageUnitPrice();
            double newIncomingValue = item.getQuantity() * item.getUnitPrice();
            int newTotalQuantity = stock.getAvailableQuantity() + item.getQuantity();

            if (newTotalQuantity > 0) {
                stock.setWeightedAverageUnitPrice((currentTotalValue + newIncomingValue) / newTotalQuantity);
            }

            stock.addQuantity(item.getQuantity());
            stock.setUnitPrice(item.getUnitPrice());

            create(stock);
        });
    }

    public void processStockReturn(StockTontineReturn returnRequest) {
        int year = returnRequest.getReturnDate().getYear();
        returnRequest.getItems().forEach(item -> {
            TontineStock stock = getRepository().findByArticleIdAndCommercialAndYear(
                    item.getArticle().getId(),
                    returnRequest.getCollector(),
                    year
            ).orElseThrow(() -> new CustomValidationException("Stock introuvable pour le retour de l'article " + item.getArticle().getCommercialName()));

            stock.returnQuantity(item.getQuantity());
            create(stock);
        });
    }

    public List<TontineStock> getStock(String commercial) {
        return getRepository()
                .findByCommercialAndYear(commercial,
                        LocalDate.now().getYear())
                .stream()
                .filter(stock -> stock.getAvailableQuantity() > 0)
                .toList();
    }

    public List<TontineStock> getStock() {
        return getStock(userService.getCurrentUser().getUsername());
    }

    public Page<TontineStock> getAll(String collector, Pageable pageable, Boolean historic) {
        LocalDate now = LocalDate.now();
        User currentUser = userService.getCurrentUser();
        
        String targetCollector = collector;
        if (targetCollector == null && currentUser.is(UserProfilConstant.PROMOTER)) {
            targetCollector = currentUser.getUsername();
        }

        if (Objects.nonNull(historic) && Boolean.TRUE.equals(historic)) {
            if (targetCollector != null) {
                return getRepository().findByCommercialAndYearNotOrderByYearDesc(targetCollector, now.getYear(), pageable);
            }
            return getRepository().findByYearNotOrderByCommercialAscYearDesc(now.getYear(), pageable);
        } else {
            if (targetCollector != null) {
                return getRepository().findByCommercialAndYearOrderByCommercialAsc(targetCollector, now.getYear(), pageable);
            }
            return getRepository().findByYearOrderByCommercialAsc(now.getYear(), pageable);
        }
    }

    @Override
    public TontineStockRepository getRepository() {
        return (TontineStockRepository) super.getRepository();
    }
}
