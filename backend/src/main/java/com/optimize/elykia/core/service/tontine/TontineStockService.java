package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.enumaration.StockOperation;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.stock.TontineStockMovementService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class TontineStockService extends GenericService<TontineStock, Long> {
    private final UserService userService;
    private final TontineStockMovementService tontineStockMovementService;

    protected TontineStockService(TontineStockRepository repository,
                                  UserService userService,
                                  TontineStockMovementService tontineStockMovementService) {
        super(repository);
        this.userService = userService;
        this.tontineStockMovementService = tontineStockMovementService;
    }

    public void validateTontineStockAvailability(Collection<CreditArticles> creditArticles, String commercial) {
        List<String> unAvailableStock = new ArrayList<>();
        creditArticles.forEach(creditArticle -> {
            TontineStock tontineStock = getRepository().getArticleForCommercial(creditArticle.getArticlesId(), commercial);
            if (Objects.isNull(tontineStock) || tontineStock.getAvailableQuantity() < creditArticle.getQuantity()) {
                unAvailableStock.add(creditArticle.getArticles().getCommercialName());
            }
        });

        if (!unAvailableStock.isEmpty()) {
            throw new CustomValidationException(String.format(
                    "L'article(s) %s n'est pas disponible(s) ou quantité insuffisante pour le stock du commercial",
                    String.join(", ", unAvailableStock)));
        }
    }

    @Transactional
    public void deductTontineStockForDelivery(
            Collection<CreditArticles> creditArticles,
            String commercial,
            Long creditId,
            String creditReference,
            TontineDelivery delivery) {
        Long tontineDeliveryId = delivery != null ? delivery.getId() : null;
        String tontineDeliveryReference = buildTontineDeliveryReference(delivery);

        creditArticles.forEach(creditArticle -> {
            TontineStock tontineStock = getRepository().getArticleForCommercial(creditArticle.getArticlesId(), commercial);
            if (Objects.isNull(tontineStock)) {
                throw new CustomValidationException("Stock tontine introuvable pour l'article : "
                        + creditArticle.getArticles().getCommercialName());
            }

            int quantityBefore = tontineStock.getAvailableQuantity();
            tontineStock.removeQuantity(creditArticle.getQuantity());
            int quantityAfter = tontineStock.getAvailableQuantity();
            TontineStock saved = update(tontineStock);
            creditArticle.setTontineItemId(saved.getId());

            recordMovement(
                    saved,
                    quantityBefore,
                    creditArticle.getQuantity(),
                    quantityAfter,
                    TontineStockMovementType.TONTINE_DELIVERY,
                    creditId,
                    creditReference,
                    null,
                    null,
                    null,
                    tontineDeliveryId,
                    tontineDeliveryReference);
        });
    }

    private String buildTontineDeliveryReference(TontineDelivery delivery) {
        if (delivery == null) {
            return null;
        }
        if (StringUtils.hasText(delivery.getReference())) {
            return delivery.getReference();
        }
        if (delivery.getTontineMember() != null
                && delivery.getTontineMember().getClient() != null) {
            return delivery.getTontineMember().getClient().getFullName() + " (#" + delivery.getId() + ")";
        }
        return "LIV-" + delivery.getId();
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

            int quantityBefore = stock.getAvailableQuantity();

            double currentTotalValue = stock.getAvailableQuantity() * stock.getWeightedAverageUnitPrice();
            double newIncomingValue = item.getQuantity() * item.getUnitPrice();
            int newTotalQuantity = stock.getAvailableQuantity() + item.getQuantity();

            if (newTotalQuantity > 0) {
                stock.setWeightedAverageUnitPrice((currentTotalValue + newIncomingValue) / newTotalQuantity);
            }

            stock.addQuantity(item.getQuantity());
            stock.setUnitPrice(item.getUnitPrice());

            TontineStock saved = create(stock);

            recordMovement(
                    saved,
                    quantityBefore,
                    item.getQuantity(),
                    saved.getAvailableQuantity(),
                    TontineStockMovementType.STOCK_IN,
                    null,
                    null,
                    request.getId(),
                    request.getReference(),
                    null,
                    null,
                    null);
        });
    }

    public void processStockReturn(StockTontineReturn returnRequest) {
        int year = returnRequest.getReturnDate().getYear();
        returnRequest.getItems().forEach(item -> {
            TontineStock stock = getRepository().findByArticleIdAndCommercialAndYear(
                    item.getArticle().getId(),
                    returnRequest.getCollector(),
                    year
            ).orElseThrow(() -> new CustomValidationException(
                    "Stock introuvable pour le retour de l'article " + item.getArticle().getCommercialName()));

            int quantityBefore = stock.getAvailableQuantity();
            stock.returnQuantity(item.getQuantity());
            int quantityAfter = stock.getAvailableQuantity();
            TontineStock saved = create(stock);
            item.setTontineItemId(saved.getId());

            recordMovement(
                    saved,
                    quantityBefore,
                    item.getQuantity(),
                    quantityAfter,
                    TontineStockMovementType.RETURN,
                    null,
                    null,
                    null,
                    null,
                    returnRequest.getId(),
                    null,
                    null);
        });
    }

    private void recordMovement(
            TontineStock stock,
            int quantityBefore,
            int quantityMoved,
            int quantityAfter,
            TontineStockMovementType movementType,
            Long creditId,
            String creditReference,
            Long stockTontineRequestId,
            String stockTontineRequestReference,
            Long stockTontineReturnId,
            Long tontineDeliveryId,
            String tontineDeliveryReference) {
        if (tontineStockMovementService != null) {
            tontineStockMovementService.record(
                    stock.getId(),
                    creditId,
                    creditReference,
                    stockTontineRequestId,
                    stockTontineRequestReference,
                    stockTontineReturnId,
                    tontineDeliveryId,
                    tontineDeliveryReference,
                    stock.getCommercial(),
                    stock.getArticleId(),
                    stock.getArticleName(),
                    movementType,
                    quantityBefore,
                    quantityMoved,
                    quantityAfter);
        }
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
