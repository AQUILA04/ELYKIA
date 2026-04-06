package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Objects;

@Service
@Transactional
public class StockTontineReturnService extends GenericService<StockTontineReturn, Long> {

    private final UserService userService;
    private final TontineStockService tontineStockService;
    private final ApplicationEventPublisher eventPublisher;

    protected StockTontineReturnService(StockTontineReturnRepository repository,
            UserService userService,
            TontineStockService tontineStockService,
            ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.userService = userService;
        this.tontineStockService = tontineStockService;
        this.eventPublisher = eventPublisher;
    }

    public StockTontineReturn save(StockTontineReturn entity) {
        if (entity.getId() == null) {
            entity.setReturnDate(LocalDate.now());
            User currentUser = userService.getCurrentUser();
            boolean isStoreKeeper = currentUser.is(UserProfilConstant.MAGASINIER)
                    || currentUser.is(UserProfilConstant.ADMIN)
                    || currentUser.is(UserProfilConstant.GESTIONNAIRE)
                    || currentUser.is(UserProfilConstant.SU);

            if (isStoreKeeper) {
                if (entity.getCollector() == null) {
                    entity.setCollector(userService.getCurrentUser().getUsername());
                }
                entity.setStatus(StockReturnStatus.RECEIVED);
            } else {
                entity.setCollector(userService.getCurrentUser().getUsername());
                entity.setStatus(StockReturnStatus.CREATED);
            }

            entity.getItems().forEach(item -> item.setStockTontineReturn(entity));

            StockTontineReturn saved = super.create(entity);

            if (isStoreKeeper) {
                processValidationLogic(saved);
            }

            return saved;
        }
        return super.create(entity);
    }

    public StockTontineReturn validate(Long id) {
        StockTontineReturn returnRequest = getById(id);
        if (returnRequest.getStatus() != StockReturnStatus.CREATED) {
            throw new CustomValidationException("Seuls les retours au statut CREATED peuvent être validés.");
        }

        processValidationLogic(returnRequest);

        returnRequest.setStatus(StockReturnStatus.RECEIVED);
        return update(returnRequest);
    }

    public void cancelReturn(Long returnId) {
        StockTontineReturn returnRequest = getById(returnId);
        User currentUser = userService.getCurrentUser();

        if (returnRequest.getStatus() != StockReturnStatus.CREATED) {
            throw new CustomValidationException("Seuls les retours au statut CREATED peuvent être annulés.");
        }

        boolean isCreator = returnRequest.getCollector().equals(currentUser.getUsername());
        boolean isStoreKeeper = currentUser.is(UserProfilConstant.MAGASINIER) || currentUser.is(UserProfilConstant.ADMIN);

        if (!isCreator && !isStoreKeeper) {
             throw new CustomValidationException("Vous n'avez pas le droit d'annuler ce retour.");
        }

        returnRequest.setStatus(StockReturnStatus.CANCELLED);
        update(returnRequest);
    }

    public void refuseReturn(Long returnId) {
        StockTontineReturn returnRequest = getById(returnId);
        User currentUser = userService.getCurrentUser();

        if (returnRequest.getStatus() != StockReturnStatus.CREATED) {
             throw new CustomValidationException("Seuls les retours au statut CREATED peuvent être refusés.");
        }

        boolean isStoreKeeper = currentUser.is(UserProfilConstant.MAGASINIER) || currentUser.is(UserProfilConstant.ADMIN);

        if (!isStoreKeeper) {
            throw new CustomValidationException("Vous n'avez pas le droit de refuser ce retour.");
        }

        returnRequest.setStatus(StockReturnStatus.REFUSED);
        update(returnRequest);
    }

    private void processValidationLogic(StockTontineReturn returnRequest) {
        tontineStockService.processStockReturn(returnRequest);

        double totalAmount = returnRequest.getItems().stream()
                .mapToDouble(item -> item.getQuantity() * item.getArticle().getSellingPrice())
                .sum();

        eventPublisher.publishEvent(new com.optimize.elykia.core.event.StockTontineReturnedEvent(
                this,
                totalAmount,
                returnRequest.getCollector(),
                returnRequest.getId()));
    }

    public Page<StockTontineReturn> getByCollector(String collector, Pageable pageable) {
        return ((StockTontineReturnRepository) getRepository()).findByCollector(collector, pageable);
    }

    public Page<StockTontineReturn> getAll(String collector, Pageable pageable) {
        Sort sort = Sort.by(Sort.Direction.DESC, "id");
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        if (Objects.nonNull(collector)) {
            return getByCollector(collector, pageable);
        }
        User user = userService.getCurrentUser();

        if (user.is(UserProfilConstant.PROMOTER)) {
            return getByCollector(user.getUsername(), pageable);
        }
        return getAll(pageable);
    }
}
