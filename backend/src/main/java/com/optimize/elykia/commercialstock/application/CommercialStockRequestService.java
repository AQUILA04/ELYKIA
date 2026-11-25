package com.optimize.elykia.commercialstock.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.agency.AgencyContext;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.commercialstock.api.*;
import com.optimize.elykia.commercialstock.domain.*;
import com.optimize.elykia.commercialstock.infrastructure.persistence.*;
import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.application.FifoStockValuationService;
import com.optimize.elykia.inventory.application.WarehouseStockService;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.web.dto.FifoConsumptionResult;
import com.optimize.elykia.inventory.web.dto.FifoLotSlice;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

/**
 * Service canonique de gestion des Demandes de Sortie Commerciales Unifiées ({@link CommercialStockRequest})
 * et des Retours de Stock Commerciaux Unifiés ({@link CommercialStockReturn}), raccordé au stock magasin
 * multi-agences ({@link WarehouseStockService}), aux réservations Option A, aux livraisons partielles Scénario B,
 * et à la traçabilité des lots FIFO ({@code originWarehouseLotId}).
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class CommercialStockRequestService implements CommercialStockRequestFacade, WarehouseCommercialStockPort {

    private static final List<CommercialStockRequestStatus> PENDING_REQUEST_STATUSES = List.of(
            CommercialStockRequestStatus.CREATED,
            CommercialStockRequestStatus.VALIDATED
    );

    private final CommercialStockRequestRepository requestRepository;
    private final CommercialStockReturnRepository returnRepository;
    private final CommercialStockLayerRepository layerRepository;
    private final CommercialStockLayerConsumptionRepository layerConsumptionRepository;
    private final CommercialStockLedgerEntryRepository ledgerEntryRepository;
    private final CommercialStockFacade commercialStockFacade;
    private final WarehouseStockService warehouseStockService;
    private final FifoStockValuationService fifoStockValuationService;
    private final ArticlesRepository articlesRepository;
    private final UserService userService;

    @Override
    public CommercialStockRequestView createRequest(CreateRequestCommand command) {
        if (command.items() == null || command.items().isEmpty()) {
            throw new CustomValidationException("Une demande de sortie doit contenir au moins un article.");
        }
        StockActivityType activityType = command.activityType() != null ? command.activityType() : StockActivityType.CREDIT;
        Long effectiveAgencyId = warehouseStockService.resolveAgencyId(command.agencyId());
        String commercial = command.commercialUsername() != null && !command.commercialUsername().isBlank()
                ? command.commercialUsername()
                : currentUsername();

        CommercialStockRequest request = new CommercialStockRequest();
        request.setAgencyId(effectiveAgencyId);
        request.setCommercialUsername(commercial);
        request.setActivityType(activityType);
        request.setTontineSessionId(command.tontineSessionId());
        request.setStatus(CommercialStockRequestStatus.CREATED);
        request.setRequestDate(LocalDate.now(ZoneOffset.UTC));
        request.setNote(command.note());
        request.setLegacyCreditRequestId(command.legacyCreditRequestId());
        request.setLegacyTontineRequestId(command.legacyTontineRequestId());
        request.setCreatedBy(currentUsername());
        request.setReference(generateRequestReference(activityType));

        for (RequestLineInput line : command.items()) {
            if (line.quantity() <= 0) {
                throw new CustomValidationException("La quantité demandée doit être strictement positive.");
            }
            Articles article = articlesRepository.findById(line.articleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + line.articleId()));
            CommercialStockRequestItem item = new CommercialStockRequestItem();
            item.setArticleId(article.getId());
            item.setItemName((article.getCommercialName() + " " + article.getName()).trim());
            item.setQuantityRequested(line.quantity());
            item.setQuantityReserved(0);
            item.setQuantityDelivered(0);
            item.setShortageQuantity(line.quantity());

            double defaultSalePrice = activityType == StockActivityType.TONTINE
                    ? article.getSellingPrice()
                    : article.getCreditSalePrice();
            item.setUnitSalePrice(line.unitSalePrice() != null && line.unitSalePrice() > 0 ? line.unitSalePrice() : defaultSalePrice);
            item.setUnitPurchaseCost(line.unitPurchaseCost() != null && line.unitPurchaseCost() > 0 ? line.unitPurchaseCost() : article.getPurchasePrice());
            request.addItem(item);
        }

        request.recalculateTotals();
        CommercialStockRequest saved = requestRepository.save(request);
        return toRequestView(saved);
    }

    @Override
    public CommercialStockRequestView validateRequest(Long requestId) {
        CommercialStockRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de stock introuvable : " + requestId));
        if (request.getStatus() != CommercialStockRequestStatus.CREATED) {
            throw new CustomValidationException("Seule une demande au statut CREATED peut être validée.");
        }

        String actor = currentUsername();
        for (CommercialStockRequestItem item : request.getItems()) {
            WarehouseStockReservation res = warehouseStockService.reserveStock(
                    request.getAgencyId(),
                    item.getArticleId(),
                    WarehouseReservationType.COMMERCIAL_STOCK_REQUEST,
                    request.getId(),
                    request.getReference(),
                    request.getCommercialUsername(),
                    item.getQuantityRequested(),
                    false,
                    actor);
            item.setQuantityReserved(res.getQuantityReserved());
            item.setShortageQuantity(res.getShortageQuantity());
        }

        request.setStatus(CommercialStockRequestStatus.VALIDATED);
        request.setValidationDate(LocalDate.now(ZoneOffset.UTC));
        request.recalculateTotals();
        CommercialStockRequest saved = requestRepository.save(request);
        return toRequestView(saved);
    }

    @Override
    public DeliveryOutcomeView deliverRequest(Long requestId) {
        CommercialStockRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de stock introuvable : " + requestId));
        if (request.getStatus() != CommercialStockRequestStatus.VALIDATED) {
            throw new CustomValidationException("Seule une demande au statut VALIDATED peut être livrée.");
        }

        String actor = currentUsername();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        List<CommercialStockRequestItem> deliverableItems = new ArrayList<>();
        List<RequestLineInput> backorderInputs = new ArrayList<>();

        for (CommercialStockRequestItem item : request.getItems()) {
            Articles article = articlesRepository.findById(item.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + item.getArticleId()));
            WarehouseStockPosition pos = warehouseStockService.lockOrCreatePosition(request.getAgencyId(), article.getId());

            int reservedForThisItem = item.getQuantityReserved() != null ? item.getQuantityReserved() : 0;
            // La quantité mobilisable pour cet item est sa part réservée + l'éventuel disponible non réservé
            int maxMobilizable = Math.min(
                    pos.getOnHandQuantity(),
                    reservedForThisItem + pos.availableQuantity());
            int deliverableQty = Math.min(item.getQuantityRequested(), maxMobilizable);
            int missingQty = item.getQuantityRequested() - deliverableQty;

            if (deliverableQty > 0) {
                item.setQuantityDelivered(deliverableQty);
                item.setShortageQuantity(0);
                deliverableItems.add(item);
            }
            if (missingQty > 0) {
                backorderInputs.add(new RequestLineInput(
                        item.getArticleId(),
                        missingQty,
                        item.getUnitSalePrice(),
                        item.getUnitPurchaseCost()));
            }
        }

        if (deliverableItems.isEmpty()) {
            throw new CustomValidationException("Aucun article disponible en magasin pour livrer cette demande.");
        }

        // Retirer de la demande livrée les lignes à 0 livrable (reportées intégralement dans la sous-demande enfant)
        request.getItems().removeIf(i -> i.getQuantityDelivered() == null || i.getQuantityDelivered() <= 0);
        for (CommercialStockRequestItem item : request.getItems()) {
            // Ajuster quantityRequested de la demande parente sur ce qui est effectivement livré
            int reservedConsumed = Math.min(
                    item.getQuantityReserved() != null ? item.getQuantityReserved() : 0,
                    item.getQuantityDelivered());
            item.setQuantityRequested(item.getQuantityDelivered());
            item.setQuantityReserved(reservedConsumed);
            item.setShortageQuantity(0);
        }

        // Consommation FIFO magasin + écriture ledger magasin + alimentation CommercialStockLayer avec originWarehouseLotId
        for (CommercialStockRequestItem item : request.getItems()) {
            Articles article = articlesRepository.findById(item.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + item.getArticleId()));
            int qty = item.getQuantityDelivered();

            FifoConsumptionResult consumption = fifoStockValuationService.consumeForAgency(
                    request.getAgencyId(),
                    article,
                    qty,
                    ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                    "COMMERCIAL_STOCK_REQUEST",
                    request.getId());

            warehouseStockService.recordStockRelease(
                    request.getAgencyId(),
                    article,
                    qty,
                    item.getQuantityReserved() != null ? item.getQuantityReserved() : 0,
                    consumption.getAverageUnitCost(),
                    "SORTIE",
                    "COMMERCIAL_STOCK_REQUEST",
                    request.getId(),
                    request.getReference(),
                    request.getCommercialUsername(),
                    "Livraison demande " + request.getReference(),
                    actor);

            if (consumption.getAverageUnitCost() > 0) {
                item.setUnitPurchaseCost(consumption.getAverageUnitCost());
            }

            CommercialStockReferenceType refType = CommercialStockReferenceType.STOCK_REQUEST;

            if (consumption.getSlices() != null && !consumption.getSlices().isEmpty()) {
                for (FifoLotSlice slice : consumption.getSlices()) {
                    double sliceCost = slice.getUnitPurchasePrice() > 0
                            ? slice.getUnitPurchasePrice()
                            : item.getUnitPurchaseCost();
                    Double sliceSalePrice = slice.getUnitSalePrice() != null && slice.getUnitSalePrice() > 0
                            && request.getActivityType() == StockActivityType.TONTINE
                            ? slice.getUnitSalePrice()
                            : item.getUnitSalePrice();
                    commercialStockFacade.stockIn(new StockInCommand(
                            request.getCommercialUsername(),
                            item.getArticleId(),
                            request.getActivityType(),
                            slice.getQuantity(),
                            sliceCost,
                            sliceSalePrice,
                            refType,
                            request.getId(),
                            request.getReference(),
                            request.getTontineSessionId(),
                            today,
                            actor,
                            slice.getLotId(),
                            null));
                }
            } else {
                commercialStockFacade.stockIn(new StockInCommand(
                        request.getCommercialUsername(),
                        item.getArticleId(),
                        request.getActivityType(),
                        qty,
                        item.getUnitPurchaseCost(),
                        item.getUnitSalePrice(),
                        refType,
                        request.getId(),
                        request.getReference(),
                        request.getTontineSessionId(),
                        today,
                        actor,
                        null,
                        null));
            }
        }

        // Clôturer les réservations de la demande parente
        warehouseStockService.releaseReservationsForReference(
                WarehouseReservationType.COMMERCIAL_STOCK_REQUEST, request.getId(), actor);

        request.setStatus(CommercialStockRequestStatus.DELIVERED);
        request.setDeliveryDate(today);
        request.setAccountingDate(today);
        request.recalculateTotals();
        CommercialStockRequest savedDelivered = requestRepository.save(request);

        CommercialStockRequestView childView = null;
        if (!backorderInputs.isEmpty()) {
            // Scénario B : création automatique de la sous-demande enfant VALIDATED pour le reliquat manquant
            CommercialStockRequest child = new CommercialStockRequest();
            child.setAgencyId(request.getAgencyId());
            child.setCommercialUsername(request.getCommercialUsername());
            child.setActivityType(request.getActivityType());
            child.setTontineSessionId(request.getTontineSessionId());
            child.setParentRequestId(savedDelivered.getId());
            child.setRequestDate(today);
            child.setValidationDate(today);
            child.setStatus(CommercialStockRequestStatus.VALIDATED);
            child.setNote("Reliquat livraison partielle de " + savedDelivered.getReference());
            child.setCreatedBy(actor);
            child.setReference(generateRequestReference(request.getActivityType()));

            for (RequestLineInput line : backorderInputs) {
                Articles article = articlesRepository.findById(line.articleId())
                        .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + line.articleId()));
                CommercialStockRequestItem childItem = new CommercialStockRequestItem();
                childItem.setArticleId(article.getId());
                childItem.setItemName((article.getCommercialName() + " " + article.getName()).trim());
                childItem.setQuantityRequested(line.quantity());
                childItem.setQuantityReserved(0);
                childItem.setQuantityDelivered(0);
                childItem.setShortageQuantity(line.quantity());
                childItem.setUnitSalePrice(line.unitSalePrice() != null ? line.unitSalePrice() : 0.0);
                childItem.setUnitPurchaseCost(line.unitPurchaseCost() != null ? line.unitPurchaseCost() : 0.0);
                child.addItem(childItem);
            }
            child.recalculateTotals();
            CommercialStockRequest savedChild = requestRepository.saveAndFlush(child);

            for (CommercialStockRequestItem childItem : savedChild.getItems()) {
                WarehouseStockReservation res = warehouseStockService.reserveStock(
                        savedChild.getAgencyId(),
                        childItem.getArticleId(),
                        WarehouseReservationType.COMMERCIAL_STOCK_REQUEST,
                        savedChild.getId(),
                        savedChild.getReference(),
                        savedChild.getCommercialUsername(),
                        childItem.getQuantityRequested(),
                        false,
                        actor);
                childItem.setQuantityReserved(res.getQuantityReserved());
                childItem.setShortageQuantity(res.getShortageQuantity());
            }
            savedChild = requestRepository.save(savedChild);
            childView = toRequestView(savedChild);
        }

        return new DeliveryOutcomeView(!backorderInputs.isEmpty(), toRequestView(savedDelivered), childView);
    }

    @Override
    public CommercialStockRequestView cancelRequest(Long requestId) {
        CommercialStockRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de stock introuvable : " + requestId));
        if (request.getStatus() == CommercialStockRequestStatus.DELIVERED) {
            throw new CustomValidationException("Une demande déjà livrée ne peut plus être annulée.");
        }
        if (request.getStatus() == CommercialStockRequestStatus.VALIDATED) {
            warehouseStockService.releaseReservationsForReference(
                    WarehouseReservationType.COMMERCIAL_STOCK_REQUEST, request.getId(), currentUsername());
        }
        request.setStatus(CommercialStockRequestStatus.CANCELLED);
        for (CommercialStockRequestItem item : request.getItems()) {
            item.setQuantityReserved(0);
            item.setShortageQuantity(0);
        }
        return toRequestView(requestRepository.save(request));
    }

    @Override
    public CommercialStockRequestView refuseRequest(Long requestId) {
        CommercialStockRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de stock introuvable : " + requestId));
        if (request.getStatus() != CommercialStockRequestStatus.CREATED) {
            throw new CustomValidationException("Seule une demande au statut CREATED peut être refusée.");
        }
        request.setStatus(CommercialStockRequestStatus.REFUSED);
        for (CommercialStockRequestItem item : request.getItems()) {
            item.setQuantityReserved(0);
            item.setShortageQuantity(0);
        }
        return toRequestView(requestRepository.save(request));
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialStockRequestView getRequestById(Long requestId) {
        return requestRepository.findByIdWithItems(requestId)
                .map(this::toRequestView)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de stock introuvable : " + requestId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommercialStockRequestView> searchRequests(
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            CommercialStockRequestStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {
        Long effectiveAgencyId = AgencyContext.getCurrentAgencyId() != null
                ? AgencyContext.getCurrentAgencyId()
                : agencyId;
        return requestRepository.search(effectiveAgencyId, commercialUsername, activityType, status, startDate, endDate, pageable)
                .map(this::toRequestView);
    }

    @Override
    public CommercialStockReturnView createReturn(CreateReturnCommand command) {
        if (command.items() == null || command.items().isEmpty()) {
            throw new CustomValidationException("Un retour de stock doit contenir au moins un article.");
        }
        StockActivityType activityType = command.activityType() != null ? command.activityType() : StockActivityType.CREDIT;
        Long effectiveAgencyId = warehouseStockService.resolveAgencyId(command.agencyId());
        String commercial = command.commercialUsername() != null && !command.commercialUsername().isBlank()
                ? command.commercialUsername()
                : currentUsername();

        CommercialStockReturn ret = new CommercialStockReturn();
        ret.setAgencyId(effectiveAgencyId);
        ret.setCommercialUsername(commercial);
        ret.setActivityType(activityType);
        ret.setTontineSessionId(command.tontineSessionId());
        ret.setStatus(CommercialStockReturnStatus.CREATED);
        ret.setReturnDate(LocalDate.now(ZoneOffset.UTC));
        ret.setNote(command.note());
        ret.setLegacyCreditReturnId(command.legacyCreditReturnId());
        ret.setLegacyTontineReturnId(command.legacyTontineReturnId());
        ret.setCreatedBy(currentUsername());
        ret.setReference(generateReturnReference());

        for (RequestLineInput line : command.items()) {
            if (line.quantity() <= 0) {
                throw new CustomValidationException("La quantité retournée doit être strictement positive.");
            }
            Articles article = articlesRepository.findById(line.articleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + line.articleId()));
            CommercialStockReturnItem item = new CommercialStockReturnItem();
            item.setArticleId(article.getId());
            item.setItemName((article.getCommercialName() + " " + article.getName()).trim());
            item.setQuantity(line.quantity());
            double defaultSalePrice = activityType == StockActivityType.TONTINE
                    ? article.getSellingPrice()
                    : article.getCreditSalePrice();
            item.setUnitSalePrice(line.unitSalePrice() != null && line.unitSalePrice() > 0 ? line.unitSalePrice() : defaultSalePrice);
            item.setUnitPurchaseCost(line.unitPurchaseCost() != null && line.unitPurchaseCost() > 0 ? line.unitPurchaseCost() : article.getPurchasePrice());
            ret.addItem(item);
        }

        return toReturnView(returnRepository.save(ret));
    }

    @Override
    public CommercialStockReturnView validateReturn(Long returnId) {
        CommercialStockReturn ret = returnRepository.findByIdForUpdate(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Retour de stock introuvable : " + returnId));
        if (ret.getStatus() != CommercialStockReturnStatus.CREATED) {
            throw new CustomValidationException("Seul un retour au statut CREATED peut être validé.");
        }

        String actor = currentUsername();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        CommercialStockReferenceType refType = CommercialStockReferenceType.STOCK_RETURN;

        for (CommercialStockReturnItem item : ret.getItems()) {
            Articles article = articlesRepository.findById(item.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + item.getArticleId()));

            CommercialStockConsumptionResult consumed = commercialStockFacade.consume(new ConsumeStockCommand(
                    ret.getCommercialUsername(),
                    item.getArticleId(),
                    ret.getActivityType(),
                    CommercialStockMovementType.RETURN,
                    item.getQuantity(),
                    CommercialSalePriceSource.LAYER_FIFO,
                    item.getUnitSalePrice(),
                    refType,
                    ret.getId(),
                    ret.getReference(),
                    ret.getTontineSessionId(),
                    today,
                    null,
                    actor));

            double unitCost = consumed.averagePurchaseCost() > 0
                    ? consumed.averagePurchaseCost()
                    : (article.getPurchasePrice() > 0 ? article.getPurchasePrice() : 1.0);
            item.setUnitPurchaseCost(unitCost);

            fifoStockValuationService.registerEntryForAgency(
                    ret.getAgencyId(),
                    article,
                    item.getQuantity(),
                    unitCost,
                    ArticleStockLotSourceType.STOCK_RETURN,
                    null,
                    null,
                    today);

            warehouseStockService.recordStockEntry(
                    ret.getAgencyId(),
                    article,
                    item.getQuantity(),
                    unitCost,
                    "RETURN",
                    "COMMERCIAL_STOCK_RETURN",
                    ret.getId(),
                    ret.getReference(),
                    ret.getCommercialUsername(),
                    "Retour commercial " + ret.getReference(),
                    actor);
        }

        ret.setStatus(CommercialStockReturnStatus.VALIDATED);
        ret.setReceivedDate(today);
        ret.setReceivedBy(actor);
        return toReturnView(returnRepository.save(ret));
    }

    @Override
    public CommercialStockReturnView cancelReturn(Long returnId) {
        CommercialStockReturn ret = returnRepository.findByIdForUpdate(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Retour de stock introuvable : " + returnId));
        if (ret.getStatus() != CommercialStockReturnStatus.CREATED) {
            throw new CustomValidationException("Seul un retour au statut CREATED peut être annulé.");
        }
        ret.setStatus(CommercialStockReturnStatus.CANCELLED);
        return toReturnView(returnRepository.save(ret));
    }

    @Override
    public CommercialStockReturnView refuseReturn(Long returnId) {
        CommercialStockReturn ret = returnRepository.findByIdForUpdate(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Retour de stock introuvable : " + returnId));
        if (ret.getStatus() != CommercialStockReturnStatus.CREATED) {
            throw new CustomValidationException("Seul un retour au statut CREATED peut être refusé.");
        }
        ret.setStatus(CommercialStockReturnStatus.REFUSED);
        return toReturnView(returnRepository.save(ret));
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialStockReturnView getReturnById(Long returnId) {
        return returnRepository.findByIdWithItems(returnId)
                .map(this::toReturnView)
                .orElseThrow(() -> new ResourceNotFoundException("Retour de stock introuvable : " + returnId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommercialStockReturnView> searchReturns(
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            CommercialStockReturnStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {
        Long effectiveAgencyId = AgencyContext.getCurrentAgencyId() != null
                ? AgencyContext.getCurrentAgencyId()
                : agencyId;
        return returnRepository.search(effectiveAgencyId, commercialUsername, activityType, status, startDate, endDate, pageable)
                .map(this::toReturnView);
    }

    @Override
    public void syncLegacyRequestState(
            Long legacyRequestId,
            StockActivityType activityType,
            String reference,
            Long agencyId,
            String commercialUsername,
            CommercialStockRequestStatus status,
            LocalDate requestDate,
            LocalDate validationDate,
            LocalDate deliveryDate,
            String note,
            List<RequestLineInput> items) {
        if (legacyRequestId == null) {
            return;
        }
        Long effectiveAgencyId = warehouseStockService.resolveAgencyId(agencyId);
        Optional<CommercialStockRequest> existingOpt = activityType == StockActivityType.TONTINE
                ? requestRepository.findByLegacyTontineRequestId(legacyRequestId)
                : requestRepository.findByLegacyCreditRequestId(legacyRequestId);

        CommercialStockRequest req = existingOpt.orElseGet(() -> {
            CommercialStockRequest created = new CommercialStockRequest();
            if (activityType == StockActivityType.TONTINE) {
                created.setLegacyTontineRequestId(legacyRequestId);
            } else {
                created.setLegacyCreditRequestId(legacyRequestId);
            }
            created.setReference(reference != null && !reference.isBlank()
                    ? reference
                    : generateRequestReference(activityType));
            created.setAgencyId(effectiveAgencyId);
            created.setCommercialUsername(commercialUsername != null ? commercialUsername : "UNKNOWN");
            created.setActivityType(activityType);
            created.setRequestDate(requestDate != null ? requestDate : LocalDate.now(ZoneOffset.UTC));
            created.setCreatedBy(currentUsername());
            return created;
        });

        CommercialStockRequestStatus previousStatus = req.getStatus();
        req.setAgencyId(effectiveAgencyId);
        if (commercialUsername != null && !commercialUsername.isBlank()) {
            req.setCommercialUsername(commercialUsername);
        }
        req.setStatus(status);
        if (requestDate != null) {
            req.setRequestDate(requestDate);
        }
        req.setValidationDate(validationDate);
        req.setDeliveryDate(deliveryDate);
        if (deliveryDate != null) {
            req.setAccountingDate(deliveryDate);
        }
        req.setNote(note);

        if (items != null && !items.isEmpty()) {
            req.getItems().clear();
            for (RequestLineInput line : items) {
                if (line.articleId() == null || line.quantity() <= 0) {
                    continue;
                }
                Articles article = articlesRepository.findById(line.articleId()).orElse(null);
                CommercialStockRequestItem item = new CommercialStockRequestItem();
                item.setArticleId(line.articleId());
                item.setItemName(article != null ? (article.getCommercialName() + " " + article.getName()).trim() : ("Article #" + line.articleId()));
                item.setQuantityRequested(line.quantity());
                item.setQuantityDelivered(status == CommercialStockRequestStatus.DELIVERED ? line.quantity() : 0);
                item.setQuantityReserved(0);
                item.setShortageQuantity(status == CommercialStockRequestStatus.CREATED || status == CommercialStockRequestStatus.VALIDATED ? line.quantity() : 0);
                item.setUnitSalePrice(line.unitSalePrice() != null ? line.unitSalePrice() : (article != null ? article.getCreditSalePrice() : 0.0));
                item.setUnitPurchaseCost(line.unitPurchaseCost() != null ? line.unitPurchaseCost() : (article != null ? article.getPurchasePrice() : 0.0));
                req.addItem(item);
            }
        }
        req.recalculateTotals();
        CommercialStockRequest saved = requestRepository.saveAndFlush(req);

        String actor = currentUsername();
        if (status == CommercialStockRequestStatus.VALIDATED && previousStatus != CommercialStockRequestStatus.VALIDATED) {
            warehouseStockService.releaseReservationsForReference(
                    WarehouseReservationType.COMMERCIAL_STOCK_REQUEST, saved.getId(), actor);
            for (CommercialStockRequestItem item : saved.getItems()) {
                WarehouseStockReservation res = warehouseStockService.reserveStock(
                        saved.getAgencyId(),
                        item.getArticleId(),
                        WarehouseReservationType.COMMERCIAL_STOCK_REQUEST,
                        saved.getId(),
                        saved.getReference(),
                        saved.getCommercialUsername(),
                        item.getQuantityRequested(),
                        false,
                        actor);
                item.setQuantityReserved(res.getQuantityReserved());
                item.setShortageQuantity(res.getShortageQuantity());
            }
            requestRepository.save(saved);
        } else if ((status == CommercialStockRequestStatus.CANCELLED
                || status == CommercialStockRequestStatus.REFUSED
                || status == CommercialStockRequestStatus.DELIVERED
                || status == CommercialStockRequestStatus.CREATED)
                && previousStatus == CommercialStockRequestStatus.VALIDATED) {
            warehouseStockService.releaseReservationsForReference(
                    WarehouseReservationType.COMMERCIAL_STOCK_REQUEST, saved.getId(), actor);
        }
    }

    @Override
    public void syncLegacyReturnState(
            Long legacyReturnId,
            StockActivityType activityType,
            String reference,
            Long agencyId,
            String commercialUsername,
            CommercialStockReturnStatus status,
            LocalDate returnDate,
            LocalDate receivedDate,
            String receivedBy,
            String note,
            List<RequestLineInput> items) {
        if (legacyReturnId == null) {
            return;
        }
        Long effectiveAgencyId = warehouseStockService.resolveAgencyId(agencyId);
        Optional<CommercialStockReturn> existingOpt = activityType == StockActivityType.TONTINE
                ? returnRepository.findByLegacyTontineReturnId(legacyReturnId)
                : returnRepository.findByLegacyCreditReturnId(legacyReturnId);

        CommercialStockReturn ret = existingOpt.orElseGet(() -> {
            CommercialStockReturn created = new CommercialStockReturn();
            if (activityType == StockActivityType.TONTINE) {
                created.setLegacyTontineReturnId(legacyReturnId);
            } else {
                created.setLegacyCreditReturnId(legacyReturnId);
            }
            created.setReference(reference != null && !reference.isBlank() ? reference : generateReturnReference());
            created.setAgencyId(effectiveAgencyId);
            created.setCommercialUsername(commercialUsername != null ? commercialUsername : "UNKNOWN");
            created.setActivityType(activityType);
            created.setReturnDate(returnDate != null ? returnDate : LocalDate.now(ZoneOffset.UTC));
            created.setCreatedBy(currentUsername());
            return created;
        });

        ret.setAgencyId(effectiveAgencyId);
        if (commercialUsername != null && !commercialUsername.isBlank()) {
            ret.setCommercialUsername(commercialUsername);
        }
        ret.setStatus(status);
        if (returnDate != null) {
            ret.setReturnDate(returnDate);
        }
        ret.setReceivedDate(receivedDate);
        ret.setReceivedBy(receivedBy);
        ret.setNote(note);

        if (items != null && !items.isEmpty()) {
            ret.getItems().clear();
            for (RequestLineInput line : items) {
                if (line.articleId() == null || line.quantity() <= 0) {
                    continue;
                }
                Articles article = articlesRepository.findById(line.articleId()).orElse(null);
                CommercialStockReturnItem item = new CommercialStockReturnItem();
                item.setArticleId(line.articleId());
                item.setItemName(article != null ? (article.getCommercialName() + " " + article.getName()).trim() : ("Article #" + line.articleId()));
                item.setQuantity(line.quantity());
                item.setUnitSalePrice(line.unitSalePrice() != null ? line.unitSalePrice() : 0.0);
                item.setUnitPurchaseCost(line.unitPurchaseCost() != null ? line.unitPurchaseCost() : 0.0);
                ret.addItem(item);
            }
        }
        returnRepository.save(ret);
    }

    // ===== WarehouseCommercialStockPort implementation =====

    @Override
    @Transactional(readOnly = true)
    public List<PendingCommercialRequestLine> findPendingRequestLines(Long agencyId, String activityType) {
        StockActivityType activity = null;
        if (activityType != null && !activityType.isBlank() && !"ALL".equalsIgnoreCase(activityType)) {
            activity = StockActivityType.valueOf(activityType.trim().toUpperCase(Locale.ROOT));
        }
        List<CommercialStockRequest> requests = requestRepository.findWithItemsByAgencyAndActivityAndStatuses(
                agencyId, activity, PENDING_REQUEST_STATUSES);

        List<PendingCommercialRequestLine> lines = new ArrayList<>();
        for (CommercialStockRequest req : requests) {
            for (CommercialStockRequestItem item : req.getItems()) {
                lines.add(new PendingCommercialRequestLine(
                        req.getId(),
                        req.getReference(),
                        req.getAgencyId(),
                        req.getCommercialUsername(),
                        req.getActivityType().name(),
                        req.getStatus().name(),
                        req.getRequestDate(),
                        item.getArticleId(),
                        item.getQuantityRequested() != null ? item.getQuantityRequested() : 0,
                        item.getQuantityReserved() != null ? item.getQuantityReserved() : 0,
                        item.getQuantityDelivered() != null ? item.getQuantityDelivered() : 0,
                        item.getShortageQuantity() != null ? item.getShortageQuantity() : 0,
                        item.getUnitSalePrice() != null ? item.getUnitSalePrice() : 0.0,
                        item.getUnitPurchaseCost() != null ? item.getUnitPurchaseCost() : 0.0));
            }
        }
        return lines;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommercialLayerTraceSlice> findLayerTracesByOriginWarehouseLotId(Long warehouseLotId) {
        if (warehouseLotId == null) {
            return List.of();
        }
        List<CommercialStockLayer> layers = layerRepository.findByOriginWarehouseLotIdWithPosition(warehouseLotId);
        List<CommercialLayerTraceSlice> result = new ArrayList<>();
        for (CommercialStockLayer layer : layers) {
            List<CommercialStockLayerConsumption> consList = layerConsumptionRepository.findByLayerIdOrderByIdAsc(layer.getId());
            List<CommercialConsumptionSlice> consumptionSlices = new ArrayList<>();
            for (CommercialStockLayerConsumption c : consList) {
                CommercialStockLedgerEntry mv = ledgerEntryRepository.findById(c.getMovementId()).orElse(null);
                if (mv != null && ledgerEntryRepository.existsByReversesMovementId(mv.getId())) {
                    // Si la sortie a été extournée (annulation de vente / extourne de dette), on ne la compte plus en liquidé
                    continue;
                }
                consumptionSlices.add(new CommercialConsumptionSlice(
                        c.getMovementId(),
                        mv != null && mv.getMovementType() != null ? mv.getMovementType().name() : "CONSUMPTION",
                        c.getQuantity() != null ? c.getQuantity() : 0,
                        c.getUnitPurchaseCost() != null ? c.getUnitPurchaseCost() : 0.0,
                        c.getUnitSalePrice(),
                        mv != null && mv.getReferenceType() != null ? mv.getReferenceType().name() : null,
                        mv != null ? mv.getReferenceId() : null,
                        mv != null ? mv.getReferenceCode() : null,
                        mv != null ? mv.getAccountingDate() : null,
                        mv != null ? mv.getPerformedBy() : null));
            }
            CommercialStockPosition pos = layer.getPosition();
            result.add(new CommercialLayerTraceSlice(
                    layer.getId(),
                    pos != null ? pos.getCommercialUsername() : "UNKNOWN",
                    pos != null && pos.getActivityType() != null ? pos.getActivityType().name() : "CREDIT",
                    layer.getQuantityInitial() != null ? layer.getQuantityInitial() : 0,
                    layer.getQuantityRemaining() != null ? layer.getQuantityRemaining() : 0,
                    layer.getUnitPurchaseCost() != null ? layer.getUnitPurchaseCost() : 0.0,
                    layer.getEffectiveSalePrice(),
                    layer.getAcquiredAt(),
                    consumptionSlices));
        }
        return result;
    }

    @Override
    public void onReservationAutoAllocated(Long requestId, Long articleId, int newReservedQty, int newShortageQty) {
        if (requestId == null || articleId == null) {
            return;
        }
        requestRepository.findByIdWithItems(requestId).ifPresent(req -> {
            for (CommercialStockRequestItem item : req.getItems()) {
                if (Objects.equals(item.getArticleId(), articleId)) {
                    item.setQuantityReserved(newReservedQty);
                    item.setShortageQuantity(newShortageQty);
                }
            }
            requestRepository.save(req);
        });
    }

    private String generateRequestReference(StockActivityType activityType) {
        Long maxId = requestRepository.findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        String prefix = activityType == StockActivityType.TONTINE ? "TRQ" : "REQ";
        String candidate = String.format("%s-%04d-%02d-%08X", prefix, now.getYear(), now.getMonthValue(), nextId);
        if (requestRepository.findByReference(candidate).isPresent()) {
            candidate = candidate + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
        }
        return candidate;
    }

    private String generateReturnReference() {
        Long maxId = returnRepository.findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        return String.format("RET-%04d-%02d-%08X", now.getYear(), now.getMonthValue(), nextId);
    }

    private String currentUsername() {
        try {
            User user = userService.getCurrentUser();
            return user != null && user.getUsername() != null ? user.getUsername() : "system";
        } catch (Exception e) {
            return "system";
        }
    }

    private CommercialStockRequestView toRequestView(CommercialStockRequest r) {
        List<RequestItemView> itemViews = r.getItems() == null ? List.of()
                : r.getItems().stream()
                .map(i -> new RequestItemView(
                        i.getId(),
                        i.getArticleId(),
                        i.getItemName(),
                        i.getQuantityRequested() != null ? i.getQuantityRequested() : 0,
                        i.getQuantityReserved() != null ? i.getQuantityReserved() : 0,
                        i.getQuantityDelivered() != null ? i.getQuantityDelivered() : 0,
                        i.getShortageQuantity() != null ? i.getShortageQuantity() : 0,
                        i.getUnitSalePrice() != null ? i.getUnitSalePrice() : 0.0,
                        i.getUnitPurchaseCost() != null ? i.getUnitPurchaseCost() : 0.0))
                .toList();
        return new CommercialStockRequestView(
                r.getId(),
                r.getReference(),
                r.getAgencyId(),
                r.getCommercialUsername(),
                r.getActivityType(),
                r.getTontineSessionId(),
                r.getStatus(),
                r.getRequestDate(),
                r.getValidationDate(),
                r.getDeliveryDate(),
                r.getAccountingDate(),
                r.getTotalSalePrice() != null ? r.getTotalSalePrice() : 0.0,
                r.getTotalPurchasePrice() != null ? r.getTotalPurchasePrice() : 0.0,
                r.getNote(),
                r.getParentRequestId(),
                r.getLegacyCreditRequestId(),
                r.getLegacyTontineRequestId(),
                itemViews);
    }

    private CommercialStockReturnView toReturnView(CommercialStockReturn r) {
        List<ReturnItemView> itemViews = r.getItems() == null ? List.of()
                : r.getItems().stream()
                .map(i -> new ReturnItemView(
                        i.getId(),
                        i.getArticleId(),
                        i.getItemName(),
                        i.getQuantity() != null ? i.getQuantity() : 0,
                        i.getUnitSalePrice() != null ? i.getUnitSalePrice() : 0.0,
                        i.getUnitPurchaseCost() != null ? i.getUnitPurchaseCost() : 0.0))
                .toList();
        return new CommercialStockReturnView(
                r.getId(),
                r.getReference(),
                r.getAgencyId(),
                r.getCommercialUsername(),
                r.getActivityType(),
                r.getTontineSessionId(),
                r.getStatus(),
                r.getReturnDate(),
                r.getReceivedDate(),
                r.getReceivedBy(),
                r.getNote(),
                r.getLegacyCreditReturnId(),
                r.getLegacyTontineReturnId(),
                itemViews);
    }
}
