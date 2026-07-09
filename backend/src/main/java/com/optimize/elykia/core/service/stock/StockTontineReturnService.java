package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.entity.stock.StockTontineReturnItem;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.util.ArticleSortOrder;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.stock.StockTontineReturnListDto;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
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
        update(returnRequest);

        double totalAmount = returnRequest.getItems().stream()
                .mapToDouble(item -> item.getQuantity() * item.getArticle().getSellingPrice())
                .sum();

        eventPublisher.publishEvent(new com.optimize.elykia.core.event.StockTontineReturnedEvent(
                this,
                totalAmount,
                returnRequest.getCollector(),
                returnRequest.getId()));
    }

    @Override
    public StockTontineReturn getById(Long id) {
        return ((StockTontineReturnRepository) getRepository()).findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    public List<StockTontineReturnItem> getItemsById(Long id) {
        StockTontineReturn stockReturn = getById(id);
        return stockReturn.getItems().stream()
                .sorted(ArticleSortOrder.forStockTontineReturnItems())
                .toList();
    }

    public Page<StockTontineReturn> getByCollector(String collector, Pageable pageable) {
        return ((StockTontineReturnRepository) getRepository()).findByCollector(collector, pageable);
    }

    public Page<StockTontineReturnListDto> getAll(String collector, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        StockTontineReturnRepository repo = (StockTontineReturnRepository) getRepository();
        String effectiveCollector = resolveCollector(collector);
        return repo.findFilteredList(effectiveCollector, startDate, endDate, resolveVisibleStatuses(), pageable);
    }

    public com.optimize.elykia.core.dto.stock.StockReturnKpiDto getKpis(String collector, LocalDate startDate, LocalDate endDate) {
        StockTontineReturnRepository repo = (StockTontineReturnRepository) getRepository();
        String effectiveCollector = resolveCollector(collector);
        List<Object[]> counts = repo.countByStatusFiltered(effectiveCollector, startDate, endDate, resolveVisibleStatuses());

        long pending = 0;
        long received = 0;
        long cancelledRefused = 0;

        for (Object[] row : counts) {
            StockReturnStatus status = (StockReturnStatus) row[0];
            long count = (Long) row[1];
            switch (status) {
                case CREATED -> pending = count;
                case RECEIVED -> received = count;
                case CANCELLED, REFUSED -> cancelledRefused += count;
                default -> { }
            }
        }

        return com.optimize.elykia.core.dto.stock.StockReturnKpiDto.builder()
                .total(pending + received + cancelledRefused)
                .pending(pending)
                .received(received)
                .cancelledRefused(cancelledRefused)
                .build();
    }

    private String resolveCollector(String collector) {
        if (collector != null && !collector.isEmpty()) {
            return collector;
        }
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        return null;
    }

    private List<StockReturnStatus> resolveVisibleStatuses() {
        return List.of(
                StockReturnStatus.CREATED,
                StockReturnStatus.RECEIVED,
                StockReturnStatus.CANCELLED,
                StockReturnStatus.REFUSED);
    }

    /** @deprecated use {@link #getAll(String, LocalDate, LocalDate, Pageable)} */
    public Page<StockTontineReturnListDto> getAll(String collector, Pageable pageable) {
        return getAll(collector, null, null, pageable);
    }
}
