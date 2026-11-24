package com.optimize.elykia.commercialstock.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockConsumptionResult;
import com.optimize.elykia.commercialstock.api.CommercialStockFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockLayerSourceType;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementView;
import com.optimize.elykia.commercialstock.api.CommercialStockPositionView;
import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
import com.optimize.elykia.commercialstock.api.ConsumeStockCommand;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.api.StockInCommand;
import com.optimize.elykia.commercialstock.domain.CommercialStockLayer;
import com.optimize.elykia.commercialstock.domain.CommercialStockLayerConsumption;
import com.optimize.elykia.commercialstock.domain.CommercialStockLedgerEntry;
import com.optimize.elykia.commercialstock.domain.CommercialStockPosition;
import com.optimize.elykia.commercialstock.domain.ConsumptionLine;
import com.optimize.elykia.commercialstock.domain.ConsumptionPlan;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLayerConsumptionRepository;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLedgerEntryRepository;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockPositionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Moteur du ledger : toutes les mutations de stock commercial passent ici, atomiquement,
 * sous verrou pessimiste de la position, avec consommation FIFO et traçabilité par couche.
 */
@Service
@Transactional
public class CommercialStockLedgerService implements CommercialStockFacade {

    private static final Set<CommercialStockMovementType> CONSUMING_TYPES = EnumSet.of(
            CommercialStockMovementType.CREDIT_SALE,
            CommercialStockMovementType.TONTINE_DELIVERY,
            CommercialStockMovementType.RETURN,
            CommercialStockMovementType.DEBT_WRITE_OFF,
            CommercialStockMovementType.ACTIVITY_TRANSFER_OUT,
            CommercialStockMovementType.ADJUSTMENT);

    private static final Set<CommercialStockMovementType> RESTORE_TYPES = EnumSet.of(
            CommercialStockMovementType.SALE_CANCELLATION,
            CommercialStockMovementType.DEBT_REVERSAL);

    private final CommercialStockPositionRepository positionRepository;
    private final CommercialStockLedgerEntryRepository ledgerRepository;
    private final CommercialStockLayerConsumptionRepository consumptionRepository;

    public CommercialStockLedgerService(CommercialStockPositionRepository positionRepository,
                                        CommercialStockLedgerEntryRepository ledgerRepository,
                                        CommercialStockLayerConsumptionRepository consumptionRepository) {
        this.positionRepository = positionRepository;
        this.ledgerRepository = ledgerRepository;
        this.consumptionRepository = consumptionRepository;
    }

    @Override
    public CommercialStockConsumptionResult stockIn(StockInCommand command) {
        requireKey(command.collector(), command.articleId(), command.activityType());
        CommercialStockPosition position = lockOrCreate(command.collector(), command.articleId(), command.activityType());
        int before = position.getQuantityOnHand();
        CommercialStockLayer layer = position.receive(command.quantity(), command.unitPurchaseCost(), command.salePrice(),
                CommercialStockLayerSourceType.STOCK_REQUEST, command.referenceId(), null);
        positionRepository.saveAndFlush(position);

        CommercialStockLedgerEntry movement = baseMovement(position, CommercialStockMovementType.STOCK_IN, command.quantity(),
                before, command.accountingDate(), command.performedBy(), false, null);
        movement.setUnitPurchaseCost(command.unitPurchaseCost());
        movement.setUnitSalePrice(command.salePrice());
        movement.setTotalPurchaseValue(command.quantity() * command.unitPurchaseCost());
        movement.setTotalSaleValue(command.salePrice() == null ? null : command.quantity() * command.salePrice());
        movement.setReferenceType(command.referenceType());
        movement.setReferenceId(command.referenceId());
        movement.setReferenceCode(command.referenceCode());
        movement.setTontineSessionId(command.tontineSessionId());
        ledgerRepository.save(movement);

        return new CommercialStockConsumptionResult(movement.getId(), command.quantity(), command.unitPurchaseCost(),
                command.salePrice() == null ? 0d : command.salePrice(),
                command.quantity() * command.unitPurchaseCost(),
                command.salePrice() == null ? 0d : command.quantity() * command.salePrice(),
                command.salePrice() == null ? 0d : command.quantity() * (command.salePrice() - command.unitPurchaseCost()),
                position.getQuantityOnHand(),
                List.of(new CommercialStockConsumptionResult.LayerPortion(layer.getId(), command.quantity(),
                        command.unitPurchaseCost(), command.salePrice() == null ? 0d : command.salePrice())));
    }

    @Override
    public CommercialStockConsumptionResult consume(ConsumeStockCommand command) {
        requireKey(command.collector(), command.articleId(), command.activityType());
        if (!CONSUMING_TYPES.contains(command.movementType())) {
            throw new CustomValidationException("Type de mouvement non consommateur : " + command.movementType());
        }
        CommercialStockPosition position = positionRepository
                .findForUpdate(command.collector(), command.articleId(), command.activityType())
                .orElseThrow(() -> new CustomValidationException("Aucun stock commercial " + command.activityType()
                        + " pour " + command.collector() + " (article " + command.articleId() + ")."));

        boolean backdated = command.backdatedReason() != null && !command.backdatedReason().isBlank();
        LocalDate accountingDate = resolveAccountingDate(command.accountingDate());
        if (backdated) {
            assertBackdatedBalanceStaysNonNegative(position, accountingDate, command.quantity());
        }

        int before = position.getQuantityOnHand();
        CommercialSalePriceSource priceSource = command.priceSource() != null ? command.priceSource()
                : CommercialSalePriceSource.LAYER_FIFO;
        ConsumptionPlan plan = position.consume(command.quantity(), priceSource, command.catalogPrice());
        positionRepository.saveAndFlush(position);

        CommercialStockLedgerEntry movement = baseMovement(position, command.movementType(), -command.quantity(), before,
                accountingDate, command.performedBy(), backdated, command.backdatedReason());
        applyPlan(movement, plan);
        movement.setReferenceType(command.referenceType());
        movement.setReferenceId(command.referenceId());
        movement.setReferenceCode(command.referenceCode());
        movement.setTontineSessionId(command.tontineSessionId());
        ledgerRepository.save(movement);
        saveConsumptions(movement.getId(), plan);

        return toResult(movement, plan, position.getQuantityOnHand());
    }

    @Override
    public CommercialStockConsumptionResult restore(Long originalMovementId, CommercialStockMovementType restoreType,
                                                    LocalDate accountingDate, String performedBy) {
        if (!RESTORE_TYPES.contains(restoreType)) {
            throw new CustomValidationException("Type de restauration invalide : " + restoreType);
        }
        CommercialStockLedgerEntry original = ledgerRepository.findById(originalMovementId)
                .orElseThrow(() -> new CustomValidationException("Mouvement introuvable : " + originalMovementId));
        if (original.getDeltaQuantity() >= 0 || !CONSUMING_TYPES.contains(original.getMovementType())) {
            throw new CustomValidationException("Seul un mouvement de sortie peut être restauré.");
        }
        if (ledgerRepository.existsByReversesMovementId(originalMovementId)) {
            throw new CustomValidationException("Ce mouvement a déjà été restauré.");
        }
        CommercialStockPosition position = positionRepository.findByIdForUpdate(original.getPositionId())
                .orElseThrow(() -> new CustomValidationException("Position introuvable : " + original.getPositionId()));

        List<CommercialStockLayerConsumption> consumptions = consumptionRepository.findByMovementId(originalMovementId);
        List<ConsumptionLine> lines = new ArrayList<>();
        int before = position.getQuantityOnHand();
        for (CommercialStockLayerConsumption consumption : consumptions) {
            CommercialStockLayer layer = position.getLayers().stream()
                    .filter(candidate -> Objects.equals(candidate.getId(), consumption.getLayerId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Couche " + consumption.getLayerId() + " introuvable."));
            position.restoreToLayer(layer, consumption.getQuantity());
            lines.add(new ConsumptionLine(layer, consumption.getQuantity(), consumption.getUnitPurchaseCost(),
                    consumption.getUnitSalePrice() == null ? 0d : consumption.getUnitSalePrice()));
        }
        positionRepository.saveAndFlush(position);

        ConsumptionPlan plan = new ConsumptionPlan(lines);
        CommercialStockLedgerEntry movement = baseMovement(position, restoreType, plan.totalQuantity(), before,
                resolveAccountingDate(accountingDate), performedBy, false, null);
        applyPlan(movement, plan);
        movement.setReversesMovementId(originalMovementId);
        movement.setReferenceType(original.getReferenceType());
        movement.setReferenceId(original.getReferenceId());
        movement.setReferenceCode(original.getReferenceCode());
        movement.setTontineSessionId(original.getTontineSessionId());
        ledgerRepository.save(movement);
        return toResult(movement, plan, position.getQuantityOnHand());
    }

    @Override
    public int restoreByReference(String collector, Long articleId, StockActivityType activityType,
                                  CommercialStockReferenceType referenceType, Long referenceId,
                                  CommercialStockMovementType restoreType, int quantity, LocalDate accountingDate,
                                  String performedBy) {
        requireKey(collector, articleId, activityType);
        CommercialStockPosition position = positionRepository
                .findByCollectorAndArticleIdAndActivityType(collector, articleId, activityType).orElse(null);
        if (position == null || quantity <= 0) {
            return 0;
        }
        int remaining = quantity;
        int restored = 0;
        for (CommercialStockLedgerEntry candidate : ledgerRepository.findReversibleByReference(
                position.getId(), referenceType, referenceId, List.copyOf(CONSUMING_TYPES))) {
            int size = -candidate.getDeltaQuantity();
            if (size > remaining) {
                continue; // une restauration est toujours totale pour une sortie donnée
            }
            restore(candidate.getId(), restoreType, accountingDate, performedBy);
            remaining -= size;
            restored += size;
            if (remaining == 0) {
                break;
            }
        }
        return restored;
    }

    @Override
    public String transferBetweenActivities(String collector, Long articleId, StockActivityType from, StockActivityType to,
                                            int quantity, Double targetSalePrice, LocalDate accountingDate,
                                            String performedBy) {
        if (from == to) {
            throw new CustomValidationException("L'activité source et l'activité cible doivent différer.");
        }
        requireKey(collector, articleId, from);
        // Verrouillage dans un ordre déterministe (activité) pour éviter les interblocages entre transferts inverses.
        CommercialStockPosition source;
        CommercialStockPosition target;
        if (from.ordinal() < to.ordinal()) {
            source = lockExisting(collector, articleId, from);
            target = lockOrCreate(collector, articleId, to);
        } else {
            target = lockOrCreate(collector, articleId, to);
            source = lockExisting(collector, articleId, from);
        }
        String transferId = UUID.randomUUID().toString();
        LocalDate date = resolveAccountingDate(accountingDate);

        int sourceBefore = source.getQuantityOnHand();
        ConsumptionPlan plan = source.consume(quantity, CommercialSalePriceSource.LAYER_FIFO, null);
        positionRepository.saveAndFlush(source);
        CommercialStockLedgerEntry out = baseMovement(source, CommercialStockMovementType.ACTIVITY_TRANSFER_OUT, -quantity,
                sourceBefore, date, performedBy, false, null);
        applyPlan(out, plan);
        out.setReferenceType(CommercialStockReferenceType.TRANSFER);
        out.setTransferId(transferId);
        ledgerRepository.save(out);
        saveConsumptions(out.getId(), plan);

        int targetBefore = target.getQuantityOnHand();
        for (ConsumptionLine line : plan.lines()) {
            Double price = targetSalePrice != null ? targetSalePrice : line.unitSalePrice();
            target.receive(line.quantity(), line.unitPurchaseCost(), price,
                    CommercialStockLayerSourceType.ACTIVITY_TRANSFER, out.getId(), line.layer().getAcquiredAt());
        }
        positionRepository.saveAndFlush(target);
        CommercialStockLedgerEntry in = baseMovement(target, CommercialStockMovementType.ACTIVITY_TRANSFER_IN, quantity,
                targetBefore, date, performedBy, false, null);
        in.setUnitPurchaseCost(plan.averagePurchaseCost());
        in.setTotalPurchaseValue(plan.totalPurchaseValue());
        in.setUnitSalePrice(targetSalePrice != null ? targetSalePrice : plan.averageSalePrice());
        in.setTotalSaleValue(quantity * in.getUnitSalePrice());
        in.setReferenceType(CommercialStockReferenceType.TRANSFER);
        in.setTransferId(transferId);
        ledgerRepository.save(in);
        return transferId;
    }

    @Override
    public int realignSalePrices(Long articleId, StockActivityType activityType, String collector, double newSalePrice,
                                 String performedBy) {
        int total = 0;
        for (CommercialStockPosition candidate : positionRepository.findByArticle(articleId, activityType, collector)) {
            CommercialStockPosition position = positionRepository.findByIdForUpdate(candidate.getId()).orElse(null);
            if (position == null || position.getQuantityOnHand() == 0) {
                continue;
            }
            Double previous = position.getCurrentSaleUnitPrice();
            int revalued = position.revaluateSalePrice(newSalePrice);
            positionRepository.saveAndFlush(position);

            CommercialStockLedgerEntry movement = baseMovement(position, CommercialStockMovementType.PRICE_REVALUATION, 0,
                    position.getQuantityOnHand(), null, performedBy, false, null);
            movement.setPreviousSalePrice(previous);
            movement.setUnitSalePrice(newSalePrice);
            movement.setReferenceType(CommercialStockReferenceType.PRICE_CHANGE);
            movement.setTotalSaleValue(revalued * newSalePrice);
            ledgerRepository.save(movement);
            total += revalued;
        }
        return total;
    }

    @Override
    @Transactional(readOnly = true)
    public int availableQuantity(String collector, Long articleId, StockActivityType activityType) {
        return positionRepository.findByCollectorAndArticleIdAndActivityType(collector, articleId, activityType)
                .map(CommercialStockPosition::getQuantityOnHand).orElse(0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommercialStockPositionView> getPositions(String collector, StockActivityType activityType,
                                                          boolean onlyPositive) {
        return positionRepository.search(collector, activityType, onlyPositive).stream()
                .map(position -> new CommercialStockPositionView(position.getId(), position.getCollector(),
                        position.getArticleId(), position.getActivityType(), position.getQuantityOnHand(),
                        position.getWeightedAvgPurchaseCost(), position.getCurrentSaleUnitPrice(),
                        position.getLayers().stream()
                                .filter(layer -> layer.getQuantityRemaining() > 0)
                                .map(layer -> new CommercialStockPositionView.LayerView(layer.getId(),
                                        layer.getQuantityRemaining(), layer.getUnitPurchaseCost(),
                                        layer.getEffectiveSalePrice()))
                                .toList()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommercialStockMovementView> getMovements(String collector, Long articleId, StockActivityType activityType,
                                                          CommercialStockMovementType movementType, LocalDate startDate,
                                                          LocalDate endDate, int limit) {
        LocalDate from = startDate != null ? startDate : LocalDate.of(2000, 1, 1);
        LocalDate to = endDate != null ? endDate : LocalDate.now(ZoneOffset.UTC);
        int pageSize = Math.min(Math.max(limit, 1), 1000);
        return ledgerRepository.search(collector, articleId, activityType, movementType, from, to,
                        PageRequest.of(0, pageSize)).stream()
                .map(entry -> new CommercialStockMovementView(entry.getId(), entry.getCollector(), entry.getArticleId(),
                        entry.getActivityType(), entry.getMovementType(), entry.getDeltaQuantity(),
                        entry.getQuantityBefore(), entry.getQuantityAfter(), entry.getUnitPurchaseCost(),
                        entry.getUnitSalePrice(), entry.getMarginAmount(), entry.getReferenceType(),
                        entry.getReferenceId(), entry.getReferenceCode(), entry.getAccountingDate(),
                        entry.getOccurredAt(), entry.isBackdated(), entry.getPerformedBy()))
                .toList();
    }

    /**
     * Une régularisation antidatée n'est acceptée que si le solde reconstruit depuis le ledger reste ≥ 0
     * à chaque date entre la date comptable demandée et aujourd'hui.
     */
    private void assertBackdatedBalanceStaysNonNegative(CommercialStockPosition position, LocalDate date, int quantity) {
        long running = ledgerRepository.sumDeltaBefore(position.getId(), date) - quantity;
        if (running < 0) {
            throw new CustomValidationException("Stock insuffisant à la date comptable " + date + " pour cette régularisation.");
        }
        for (CommercialStockLedgerEntry movement : ledgerRepository.findFromDate(position.getId(), date)) {
            running += movement.getDeltaQuantity();
            if (running < 0) {
                throw new CustomValidationException("Stock insuffisant à la date comptable " + movement.getAccountingDate()
                        + " : la régularisation rendrait le solde historique négatif.");
            }
        }
    }

    private CommercialStockPosition lockExisting(String collector, Long articleId, StockActivityType activityType) {
        return positionRepository.findForUpdate(collector, articleId, activityType)
                .orElseThrow(() -> new CustomValidationException("Aucun stock commercial " + activityType
                        + " pour " + collector + " (article " + articleId + ")."));
    }

    private CommercialStockPosition lockOrCreate(String collector, Long articleId, StockActivityType activityType) {
        return positionRepository.findForUpdate(collector, articleId, activityType).orElseGet(() -> {
            try {
                return positionRepository.saveAndFlush(CommercialStockPosition.open(collector, articleId, activityType));
            } catch (DataIntegrityViolationException concurrentCreation) {
                return positionRepository.findForUpdate(collector, articleId, activityType).orElseThrow(() -> concurrentCreation);
            }
        });
    }

    private CommercialStockLedgerEntry baseMovement(CommercialStockPosition position, CommercialStockMovementType type,
                                                 int delta, int quantityBefore, LocalDate accountingDate,
                                                 String performedBy, boolean backdated, String backdatedReason) {
        CommercialStockLedgerEntry movement = new CommercialStockLedgerEntry();
        movement.setPositionId(position.getId());
        movement.setCollector(position.getCollector());
        movement.setArticleId(position.getArticleId());
        movement.setActivityType(position.getActivityType());
        movement.setMovementType(type);
        movement.setDeltaQuantity(delta);
        movement.setQuantityBefore(quantityBefore);
        movement.setQuantityAfter(quantityBefore + delta);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        movement.setOccurredAt(now);
        movement.setAccountingDate(resolveAccountingDate(accountingDate));
        movement.setBackdated(backdated);
        movement.setBackdatedReason(backdated ? backdatedReason : null);
        movement.setPerformedBy(performedBy);
        return movement;
    }

    private static void applyPlan(CommercialStockLedgerEntry movement, ConsumptionPlan plan) {
        movement.setUnitPurchaseCost(plan.averagePurchaseCost());
        movement.setUnitSalePrice(plan.averageSalePrice());
        movement.setTotalPurchaseValue(plan.totalPurchaseValue());
        movement.setTotalSaleValue(plan.totalSaleValue());
        movement.setMarginAmount(plan.marginAmount());
    }

    private void saveConsumptions(Long movementId, ConsumptionPlan plan) {
        List<CommercialStockLayerConsumption> rows = plan.lines().stream().map(line -> {
            CommercialStockLayerConsumption row = new CommercialStockLayerConsumption();
            row.setMovementId(movementId);
            row.setLayerId(line.layer().getId());
            row.setQuantity(line.quantity());
            row.setUnitPurchaseCost(line.unitPurchaseCost());
            row.setUnitSalePrice(line.unitSalePrice());
            return row;
        }).toList();
        consumptionRepository.saveAll(rows);
    }

    private static CommercialStockConsumptionResult toResult(CommercialStockLedgerEntry movement, ConsumptionPlan plan,
                                                             int quantityAfter) {
        return new CommercialStockConsumptionResult(movement.getId(), plan.totalQuantity(), plan.averagePurchaseCost(),
                plan.averageSalePrice(), plan.totalPurchaseValue(), plan.totalSaleValue(), plan.marginAmount(),
                quantityAfter,
                plan.lines().stream()
                        .map(line -> new CommercialStockConsumptionResult.LayerPortion(line.layer().getId(),
                                line.quantity(), line.unitPurchaseCost(), line.unitSalePrice()))
                        .toList());
    }

    private static LocalDate resolveAccountingDate(LocalDate requested) {
        return requested != null ? requested : LocalDate.now(ZoneOffset.UTC);
    }

    private static void requireKey(String collector, Long articleId, StockActivityType activityType) {
        if (collector == null || collector.isBlank() || articleId == null || activityType == null) {
            throw new CustomValidationException("Commercial, article et activité sont obligatoires.");
        }
    }
}
