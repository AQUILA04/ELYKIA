package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.agency.AgencyContext;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.WarehouseStockTransferRepository;
import com.optimize.elykia.inventory.web.dto.FifoConsumptionResult;
import com.optimize.elykia.inventory.web.dto.FifoLotSlice;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import com.optimize.elykia.shared.security.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;

/**
 * Service de transfert de stock inter-agences ({@link WarehouseStockTransfer}),
 * piloté par le Chef Magasinier ({@code STOREKEEPER_MANAGER}) :
 * - {@code CREATED} -> {@code VALIDATED} (réservation source) -> {@code SHIPPED} (sortie FIFO source) -> {@code RECEIVED} (entrée FIFO cible avec {@code parentLotId = sourceLotId}).
 */
@Service
@Transactional
@RequiredArgsConstructor
public class WarehouseStockTransferService {

    private final WarehouseStockTransferRepository transferRepository;
    private final WarehouseStockService warehouseStockService;
    private final FifoStockValuationService fifoStockValuationService;
    private final ArticlesRepository articlesRepository;
    private final UserService userService;

    public record TransferItemRequest(Long articleId, int quantity) {
    }

    public record CreateTransferRequest(Long sourceAgencyId, Long targetAgencyId, String note,
                                        List<TransferItemRequest> items) {
    }

    public WarehouseStockTransfer createTransfer(CreateTransferRequest req) {
        assertCanManageInterAgencyTransfer();
        if (req.sourceAgencyId() == null || req.targetAgencyId() == null) {
            throw new CustomValidationException("L'agence source et l'agence cible sont obligatoires.");
        }
        if (Objects.equals(req.sourceAgencyId(), req.targetAgencyId())) {
            throw new CustomValidationException("L'agence source et l'agence cible doivent être différentes.");
        }
        if (req.items() == null || req.items().isEmpty()) {
            throw new CustomValidationException("Le transfert doit contenir au moins un article.");
        }

        WarehouseStockTransfer transfer = new WarehouseStockTransfer();
        Long maxId = transferRepository.findMaxId();
        long nextId = (maxId != null ? maxId : 0) + 1;
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        transfer.setReference(String.format("XFER-%04d-%02d-%08X", now.getYear(), now.getMonthValue(), nextId));
        transfer.setSourceAgencyId(req.sourceAgencyId());
        transfer.setTargetAgencyId(req.targetAgencyId());
        transfer.setStatus(WarehouseTransferStatus.CREATED);
        transfer.setNote(req.note());
        transfer.setCreatedBy(currentUsername());
        transfer.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));

        for (TransferItemRequest line : req.items()) {
            if (line.quantity() <= 0) {
                throw new CustomValidationException("La quantité à transférer doit être strictement positive.");
            }
            Articles article = articlesRepository.findById(line.articleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + line.articleId()));
            WarehouseStockTransferItem item = new WarehouseStockTransferItem();
            item.setArticleId(article.getId());
            item.setArticleName(article.getCommercialName() + " " + article.getName());
            item.setQuantityRequested(line.quantity());
            transfer.addItem(item);
        }

        return transferRepository.save(transfer);
    }

    public WarehouseStockTransfer validateTransfer(Long transferId) {
        assertCanManageInterAgencyTransfer();
        WarehouseStockTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfert introuvable : " + transferId));
        if (transfer.getStatus() != WarehouseTransferStatus.CREATED) {
            throw new CustomValidationException("Seul un transfert au statut CREATED peut être validé.");
        }

        String actor = currentUsername();
        for (WarehouseStockTransferItem item : transfer.getItems()) {
            warehouseStockService.reserveStock(
                    transfer.getSourceAgencyId(),
                    item.getArticleId(),
                    WarehouseReservationType.TRANSFER,
                    transfer.getId(),
                    transfer.getReference(),
                    "AGENCE-" + transfer.getTargetAgencyId(),
                    item.getQuantityRequested(),
                    true,
                    actor);
        }

        transfer.setStatus(WarehouseTransferStatus.VALIDATED);
        transfer.setValidatedBy(actor);
        transfer.setValidatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return transferRepository.save(transfer);
    }

    public WarehouseStockTransfer shipTransfer(Long transferId) {
        assertCanManageInterAgencyTransfer();
        WarehouseStockTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfert introuvable : " + transferId));
        if (transfer.getStatus() != WarehouseTransferStatus.VALIDATED) {
            throw new CustomValidationException("Seul un transfert au statut VALIDATED peut être expédié.");
        }

        String actor = currentUsername();
        for (WarehouseStockTransferItem item : transfer.getItems()) {
            Articles article = articlesRepository.findById(item.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + item.getArticleId()));

            FifoConsumptionResult consumption = fifoStockValuationService.consumeForAgency(
                    transfer.getSourceAgencyId(),
                    article,
                    item.getQuantityRequested(),
                    ArticleStockLotMovementType.AGENCY_TRANSFER_OUT,
                    "WAREHOUSE_TRANSFER",
                    transfer.getId());

            warehouseStockService.recordStockRelease(
                    transfer.getSourceAgencyId(),
                    article,
                    item.getQuantityRequested(),
                    item.getQuantityRequested(),
                    consumption.getAverageUnitCost(),
                    "AGENCY_TRANSFER_OUT",
                    "WAREHOUSE_TRANSFER",
                    transfer.getId(),
                    transfer.getReference(),
                    "AGENCE-" + transfer.getTargetAgencyId(),
                    "Transfert sortant " + transfer.getReference(),
                    actor);

            item.setQuantityShipped(item.getQuantityRequested());
            item.setAverageUnitCost(consumption.getAverageUnitCost());
            if (consumption.getSlices() != null && !consumption.getSlices().isEmpty()) {
                for (FifoLotSlice slice : consumption.getSlices()) {
                    WarehouseStockTransferLotSlice lotSlice = new WarehouseStockTransferLotSlice();
                    lotSlice.setSourceLotId(slice.getLotId());
                    lotSlice.setQuantity(slice.getQuantity());
                    lotSlice.setUnitPurchasePrice(slice.getUnitPurchasePrice());
                    lotSlice.setUnitSalePrice(slice.getUnitSalePrice());
                    item.addLotSlice(lotSlice);
                }
            }
        }

        // Marquer les réservations source comme exécutées
        warehouseStockService.releaseReservationsForReference(WarehouseReservationType.TRANSFER, transfer.getId(), actor);

        transfer.setStatus(WarehouseTransferStatus.SHIPPED);
        transfer.setShippedBy(actor);
        transfer.setShippedAt(LocalDateTime.now(ZoneOffset.UTC));
        return transferRepository.save(transfer);
    }

    public WarehouseStockTransfer receiveTransfer(Long transferId) {
        WarehouseStockTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfert introuvable : " + transferId));
        if (transfer.getStatus() != WarehouseTransferStatus.SHIPPED) {
            throw new CustomValidationException("Seul un transfert expédié (SHIPPED) peut être réceptionné.");
        }
        assertCanReceiveTransfer(transfer.getTargetAgencyId());

        String actor = currentUsername();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        for (WarehouseStockTransferItem item : transfer.getItems()) {
            Articles article = articlesRepository.findById(item.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + item.getArticleId()));
            int qtyToReceive = item.getQuantityShipped() != null && item.getQuantityShipped() > 0
                    ? item.getQuantityShipped()
                    : item.getQuantityRequested();

            if (item.getLotSlices() != null && !item.getLotSlices().isEmpty()) {
                for (WarehouseStockTransferLotSlice slice : item.getLotSlices()) {
                    double unitCost = slice.getUnitPurchasePrice() != null && slice.getUnitPurchasePrice() > 0
                            ? slice.getUnitPurchasePrice()
                            : (article.getPurchasePrice() > 0 ? article.getPurchasePrice() : 1.0);
                    ArticleStockLot targetLot = fifoStockValuationService.registerEntryForAgency(
                            transfer.getTargetAgencyId(),
                            article,
                            slice.getQuantity(),
                            unitCost,
                            ArticleStockLotSourceType.AGENCY_TRANSFER_IN,
                            null,
                            slice.getSourceLotId(),
                            today);
                    slice.setTargetLotId(targetLot.getId());
                }
            } else {
                double unitCost = item.getAverageUnitCost() != null && item.getAverageUnitCost() > 0
                        ? item.getAverageUnitCost()
                        : (article.getPurchasePrice() > 0 ? article.getPurchasePrice() : 1.0);
                fifoStockValuationService.registerEntryForAgency(
                        transfer.getTargetAgencyId(),
                        article,
                        qtyToReceive,
                        unitCost,
                        ArticleStockLotSourceType.AGENCY_TRANSFER_IN,
                        null,
                        null,
                        today);
            }

            warehouseStockService.recordStockEntry(
                    transfer.getTargetAgencyId(),
                    article,
                    qtyToReceive,
                    item.getAverageUnitCost(),
                    "AGENCY_TRANSFER_IN",
                    "WAREHOUSE_TRANSFER",
                    transfer.getId(),
                    transfer.getReference(),
                    "AGENCE-" + transfer.getSourceAgencyId(),
                    "Réception transfert " + transfer.getReference(),
                    actor);

            item.setQuantityReceived(qtyToReceive);
        }

        transfer.setStatus(WarehouseTransferStatus.RECEIVED);
        transfer.setReceivedBy(actor);
        transfer.setReceivedAt(LocalDateTime.now(ZoneOffset.UTC));
        return transferRepository.save(transfer);
    }

    public WarehouseStockTransfer cancelTransfer(Long transferId) {
        assertCanManageInterAgencyTransfer();
        WarehouseStockTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfert introuvable : " + transferId));
        if (transfer.getStatus() == WarehouseTransferStatus.SHIPPED
                || transfer.getStatus() == WarehouseTransferStatus.RECEIVED) {
            throw new CustomValidationException("Un transfert déjà expédié ou réceptionné ne peut plus être annulé.");
        }
        if (transfer.getStatus() == WarehouseTransferStatus.CANCELLED) {
            return transfer;
        }
        String actor = currentUsername();
        if (transfer.getStatus() == WarehouseTransferStatus.VALIDATED) {
            warehouseStockService.releaseReservationsForReference(
                    WarehouseReservationType.TRANSFER, transfer.getId(), actor);
        }
        transfer.setStatus(WarehouseTransferStatus.CANCELLED);
        transfer.setCancelledBy(actor);
        transfer.setCancelledAt(LocalDateTime.now(ZoneOffset.UTC));
        return transferRepository.save(transfer);
    }

    @Transactional(readOnly = true)
    public WarehouseStockTransfer getById(Long transferId) {
        return transferRepository.findByIdWithItems(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfert introuvable : " + transferId));
    }

    @Transactional(readOnly = true)
    public Page<WarehouseStockTransfer> search(Long agencyId, WarehouseTransferStatus status, Pageable pageable) {
        Long effectiveAgencyId = AgencyContext.getCurrentAgencyId() != null
                ? AgencyContext.getCurrentAgencyId()
                : agencyId;
        return transferRepository.search(effectiveAgencyId, status, pageable);
    }

    private void assertCanManageInterAgencyTransfer() {
        User user = userService.getCurrentUser();
        if (user == null) {
            return;
        }
        boolean allowed = user.is(UserProfilConstant.STOREKEEPER_MANAGER)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU)
                || hasPermission(user, UserPermissionConstant.INTER_AGENCY_STOCK_TRANSFER)
                || hasPermission(user, UserPermissionConstant.STOREKEEPER_MANAGER);
        if (!allowed) {
            throw new CustomValidationException(
                    "Seul le Chef Magasinier (STOREKEEPER_MANAGER) ou un gestionnaire/administrateur peut piloter les transferts inter-agences.");
        }
    }

    private void assertCanReceiveTransfer(Long targetAgencyId) {
        User user = userService.getCurrentUser();
        if (user == null) {
            return;
        }
        boolean isGlobal = user.is(UserProfilConstant.STOREKEEPER_MANAGER)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU)
                || hasPermission(user, UserPermissionConstant.INTER_AGENCY_STOCK_TRANSFER)
                || hasPermission(user, UserPermissionConstant.STOREKEEPER_MANAGER);
        if (isGlobal) {
            return;
        }
        Long currentAgency = AgencyContext.getCurrentAgencyId();
        if (user.is(UserProfilConstant.MAGASINIER) && Objects.equals(currentAgency, targetAgencyId)) {
            return;
        }
        throw new CustomValidationException("Vous n'avez pas le droit de réceptionner ce transfert pour cette agence.");
    }

    private static boolean hasPermission(User user, String permission) {
        if (user == null || user.getPermissions() == null) {
            return false;
        }
        return user.getPermissions().stream().map(UserPermission::getName).anyMatch(permission::equals);
    }

    private String currentUsername() {
        User user = userService.getCurrentUser();
        return user != null && user.getUsername() != null ? user.getUsername() : "system";
    }
}
