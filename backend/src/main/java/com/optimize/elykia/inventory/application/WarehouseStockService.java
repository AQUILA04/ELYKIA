package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.agency.AgencyContext;
import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.*;
import com.optimize.elykia.inventory.web.dto.FifoConsumptionResult;
import com.optimize.elykia.organization.domain.Agency;
import com.optimize.elykia.organization.infrastructure.persistence.AgencyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

/**
 * Service canonique de gestion du stock magasin par agence :
 * - Positions {@link WarehouseStockPosition} ({@code onHandQuantity}, {@code reservedQuantity}, {@code availableQuantity})
 * - Réservations Option A {@link WarehouseStockReservation} + ré-allocation FIFO automatique à la réception
 * - Grand livre magasin unifié {@link WarehouseStockLedgerEntry}
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class WarehouseStockService {

    private static final List<WarehouseReservationStatus> OPEN_RESERVATION_STATUSES = List.of(
            WarehouseReservationStatus.ACTIVE,
            WarehouseReservationStatus.PARTIALLY_RESERVED,
            WarehouseReservationStatus.BACKORDERED
    );

    private static final List<WarehouseReservationStatus> SHORTAGE_RESERVATION_STATUSES = List.of(
            WarehouseReservationStatus.PARTIALLY_RESERVED,
            WarehouseReservationStatus.BACKORDERED
    );

    private final WarehouseStockPositionRepository positionRepository;
    private final WarehouseStockReservationRepository reservationRepository;
    private final WarehouseStockLedgerEntryRepository ledgerRepository;
    private final ArticlesRepository articlesRepository;
    private final AgencyRepository agencyRepository;
    private final FifoStockValuationService fifoStockValuationService;

    private WarehouseCommercialStockPort commercialStockPort;

    @Autowired(required = false)
    public void setCommercialStockPort(WarehouseCommercialStockPort commercialStockPort) {
        this.commercialStockPort = commercialStockPort;
    }

    /**
     * Résout l'ID de l'agence courante (paramètre explicite, sinon {@link AgencyContext}, sinon agence {@code DEFAULT}).
     */
    @Transactional(readOnly = true)
    public Long resolveAgencyId(Long requestedAgencyId) {
        Long contextAgencyId = AgencyContext.getCurrentAgencyId();
        if (contextAgencyId != null) {
            // Pour un profil terrain (ex. STOREKEEPER), AgencyScopeFilter impose son agence
            return contextAgencyId;
        }
        if (requestedAgencyId != null) {
            return requestedAgencyId;
        }
        return agencyRepository.findAll().stream()
                .filter(a -> "DEFAULT".equalsIgnoreCase(a.getCode()))
                .map(Agency::getId)
                .findFirst()
                .orElseGet(() -> agencyRepository.findAll().stream()
                        .map(Agency::getId)
                        .sorted()
                        .findFirst()
                        .orElseGet(this::ensureDefaultAgency));
    }

    private Long ensureDefaultAgency() {
        Agency defaultAgency = new Agency();
        defaultAgency.setCode("DEFAULT");
        defaultAgency.setName("Agence par défaut");
        defaultAgency.setActive(true);
        Agency saved = agencyRepository.saveAndFlush(defaultAgency);
        return saved.getId();
    }

    /**
     * Verrouille ou initialise la position magasin de l'article pour l'agence donnée.
     */
    public WarehouseStockPosition lockOrCreatePosition(Long agencyId, Long articleId) {
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        return positionRepository.findForUpdate(effectiveAgencyId, articleId).orElseGet(() -> {
            Articles article = articlesRepository.findById(articleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + articleId));
            WarehouseStockPosition pos = WarehouseStockPosition.open(effectiveAgencyId, articleId);
            // En test (create-drop sans backfill Flyway), si aucune position n'existait encore pour cet article,
            // on reprend l'éventuel stock initial de l'entité Articles.
            if (positionRepository.findByArticleId(articleId).isEmpty()) {
                int initialOnHand = Math.max(0, article.getStockQuantity() != null ? article.getStockQuantity() : 0);
                int initialReserved = Math.min(initialOnHand,
                        Math.max(0, article.getReservedQuantity() != null ? article.getReservedQuantity() : 0));
                pos.setOnHandQuantity(initialOnHand);
                pos.setReservedQuantity(initialReserved);
            }
            pos.setReorderPoint(article.getReorderPoint());
            pos.setOptimalStockLevel(article.getOptimalStockLevel());
            pos.setLastRestockDate(article.getLastRestockDate());
            try {
                return positionRepository.saveAndFlush(pos);
            } catch (DataIntegrityViolationException e) {
                return positionRepository.findForUpdate(effectiveAgencyId, articleId).orElseThrow(() -> e);
            }
        });
    }

    @Transactional(readOnly = true)
    public WarehouseStockPosition getOrBuildPositionView(Long agencyId, Articles article) {
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        return positionRepository.findByAgencyIdAndArticleId(effectiveAgencyId, article.getId())
                .orElseGet(() -> {
                    WarehouseStockPosition pos = WarehouseStockPosition.open(effectiveAgencyId, article.getId());
                    if (positionRepository.findByArticleId(article.getId()).isEmpty()) {
                        int onHand = Math.max(0, article.getStockQuantity() != null ? article.getStockQuantity() : 0);
                        int reserved = Math.min(onHand,
                                Math.max(0, article.getReservedQuantity() != null ? article.getReservedQuantity() : 0));
                        pos.setOnHandQuantity(onHand);
                        pos.setReservedQuantity(reserved);
                    }
                    pos.setReorderPoint(article.getReorderPoint());
                    pos.setOptimalStockLevel(article.getOptimalStockLevel());
                    pos.setLastRestockDate(article.getLastRestockDate());
                    return pos;
                });
    }

    @Transactional(readOnly = true)
    public int getShortageQuantity(Long agencyId, Long articleId) {
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        Integer shortage = reservationRepository.sumShortageByAgencyAndArticle(
                effectiveAgencyId, articleId, SHORTAGE_RESERVATION_STATUSES);
        return shortage != null ? shortage : 0;
    }

    @Transactional(readOnly = true)
    public Map<Long, Integer> getShortagesByArticle(Long agencyId) {
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        Map<Long, Integer> map = new HashMap<>();
        for (Object[] row : reservationRepository.sumShortageGroupedByArticle(effectiveAgencyId, SHORTAGE_RESERVATION_STATUSES)) {
            Long articleId = ((Number) row[0]).longValue();
            int shortage = ((Number) row[1]).intValue();
            map.put(articleId, shortage);
        }
        return map;
    }

    /**
     * Enregistre une entrée physique en stock magasin (réception fournisseur, retour commercial, transfert entrant, ajustement +)
     * et ré-alloue automatiquement en FIFO le stock disponible aux réservations en attente ({@code BACKORDERED} / {@code PARTIALLY_RESERVED}).
     */
    public WarehouseStockLedgerEntry recordStockEntry(
            Long agencyId,
            Articles article,
            int quantity,
            Double unitCost,
            String movementType,
            String referenceType,
            Long referenceId,
            String referenceCode,
            String beneficiary,
            String reason,
            String performedBy) {
        if (quantity <= 0) {
            throw new CustomValidationException("La quantité d'entrée magasin doit être strictement positive.");
        }
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        WarehouseStockPosition pos = lockOrCreatePosition(effectiveAgencyId, article.getId());
        int onHandBefore = pos.getOnHandQuantity();
        int reservedBefore = pos.getReservedQuantity();

        pos.addOnHand(quantity);
        positionRepository.saveAndFlush(pos);

        // Ré-allocation automatique aux réservations en attente (Option A / Scénario B)
        autoAllocateIncomingStockToBackorders(pos, performedBy);

        syncLegacyArticleCounters(article);

        WarehouseStockLedgerEntry entry = new WarehouseStockLedgerEntry();
        entry.setAgencyId(effectiveAgencyId);
        entry.setArticleId(article.getId());
        entry.setMovementType(movementType != null ? movementType : "ENTREE");
        entry.setQuantityDelta(quantity);
        entry.setOnHandBefore(onHandBefore);
        entry.setOnHandAfter(pos.getOnHandQuantity());
        entry.setReservedBefore(reservedBefore);
        entry.setReservedAfter(pos.getReservedQuantity());
        entry.setUnitCost(unitCost);
        entry.setTotalCost(unitCost != null ? unitCost * quantity : null);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setReferenceCode(referenceCode);
        entry.setBeneficiary(beneficiary);
        entry.setReason(reason);
        entry.setPerformedBy(performedBy);
        entry.setOperationDate(LocalDate.now(ZoneOffset.UTC));
        entry.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        return ledgerRepository.save(entry);
    }

    /**
     * Ré-alloue en FIFO le stock disponible de la position aux réservations {@code BACKORDERED} ou {@code PARTIALLY_RESERVED}.
     */
    public int autoAllocateIncomingStockToBackorders(WarehouseStockPosition pos, String performedBy) {
        if (pos.availableQuantity() <= 0) {
            return 0;
        }
        List<WarehouseStockReservation> backorders = reservationRepository
                .findByAgencyIdAndArticleIdAndStatusInOrderByCreatedAtAscIdAsc(
                        pos.getAgencyId(), pos.getArticleId(), SHORTAGE_RESERVATION_STATUSES);
        int totalAllocated = 0;
        for (WarehouseStockReservation reservation : backorders) {
            int available = pos.availableQuantity();
            if (available <= 0) {
                break;
            }
            int needed = Math.max(0, reservation.getShortageQuantity());
            if (needed <= 0) {
                continue;
            }
            int allocated = pos.reserveAvailableUpTo(needed);
            if (allocated > 0) {
                reservation.allocateAdditional(allocated);
                reservationRepository.save(reservation);
                totalAllocated += allocated;
                if (commercialStockPort != null
                        && reservation.getReservationType() == WarehouseReservationType.COMMERCIAL_STOCK_REQUEST) {
                    commercialStockPort.onReservationAutoAllocated(
                            reservation.getReferenceId(),
                            reservation.getArticleId(),
                            reservation.getQuantityReserved(),
                            reservation.getShortageQuantity());
                }
            }
        }
        if (totalAllocated > 0) {
            positionRepository.saveAndFlush(pos);
        }
        return totalAllocated;
    }

    /**
     * Crée ou met à jour une réservation magasin (Option A : à la validation d'une demande commerciale,
     * d'une vente comptant ou d'un transfert inter-agences).
     * Pour {@code COMMERCIAL_STOCK_REQUEST}, réserve {@code min(requested, available)} et place le reste en {@code shortageQuantity}.
     * Pour {@code TRANSFER} ou {@code CASH_SALE} avec {@code requireFullAvailability = true}, lève une exception si disponible < demandé.
     */
    public WarehouseStockReservation reserveStock(
            Long agencyId,
            Long articleId,
            WarehouseReservationType reservationType,
            Long referenceId,
            String referenceCode,
            String beneficiary,
            int quantityRequested,
            boolean requireFullAvailability,
            String performedBy) {
        if (quantityRequested <= 0) {
            throw new CustomValidationException("La quantité à réserver doit être strictement positive.");
        }
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        WarehouseStockPosition pos = lockOrCreatePosition(effectiveAgencyId, articleId);
        int available = pos.availableQuantity();
        if (requireFullAvailability && available < quantityRequested) {
            throw new CustomValidationException(
                    "Stock magasin disponible insuffisant pour l'article " + articleId
                            + " (disponible : " + available + ", demandé : " + quantityRequested + ").");
        }
        int reservedBefore = pos.getReservedQuantity();
        int reservedQty = pos.reserveAvailableUpTo(quantityRequested);
        positionRepository.saveAndFlush(pos);

        Articles article = articlesRepository.findById(articleId).orElse(null);
        if (article != null) {
            syncLegacyArticleCounters(article);
        }

        WarehouseStockReservation reservation = WarehouseStockReservation.create(
                effectiveAgencyId,
                articleId,
                reservationType,
                referenceId,
                referenceCode,
                beneficiary,
                quantityRequested,
                reservedQty,
                performedBy);
        WarehouseStockReservation saved = reservationRepository.save(reservation);

        WarehouseStockLedgerEntry entry = new WarehouseStockLedgerEntry();
        entry.setAgencyId(effectiveAgencyId);
        entry.setArticleId(articleId);
        entry.setMovementType("RESERVATION");
        entry.setQuantityDelta(0);
        entry.setOnHandBefore(pos.getOnHandQuantity());
        entry.setOnHandAfter(pos.getOnHandQuantity());
        entry.setReservedBefore(reservedBefore);
        entry.setReservedAfter(pos.getReservedQuantity());
        entry.setReferenceType(reservationType.name());
        entry.setReferenceId(referenceId);
        entry.setReferenceCode(referenceCode);
        entry.setBeneficiary(beneficiary);
        entry.setReason("Réservation " + (referenceCode != null ? referenceCode : referenceId)
                + " (réservé=" + reservedQty + ", manquant=" + saved.getShortageQuantity() + ")");
        entry.setPerformedBy(performedBy);
        entry.setOperationDate(LocalDate.now(ZoneOffset.UTC));
        entry.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        ledgerRepository.save(entry);

        return saved;
    }

    /**
     * Libère toutes les réservations ouvertes associées à une référence (annulation ou refus de demande / transfert / vente comptant).
     */
    public void releaseReservationsForReference(
            WarehouseReservationType reservationType,
            Long referenceId,
            String performedBy) {
        List<WarehouseStockReservation> reservations = reservationRepository
                .findByReservationTypeAndReferenceId(reservationType, referenceId);
        for (WarehouseStockReservation res : reservations) {
            if (res.getStatus() == WarehouseReservationStatus.FULFILLED
                    || res.getStatus() == WarehouseReservationStatus.RELEASED) {
                continue;
            }
            WarehouseStockPosition pos = lockOrCreatePosition(res.getAgencyId(), res.getArticleId());
            int reservedBefore = pos.getReservedQuantity();
            int toRelease = res.getQuantityReserved() != null ? res.getQuantityReserved() : 0;
            pos.releaseReserved(toRelease);
            res.markReleased();
            reservationRepository.save(res);
            positionRepository.saveAndFlush(pos);

            // Le stock libéré peut immédiatement couvrir d'autres demandes en attente en FIFO
            autoAllocateIncomingStockToBackorders(pos, performedBy);

            articlesRepository.findById(res.getArticleId()).ifPresent(this::syncLegacyArticleCounters);

            WarehouseStockLedgerEntry entry = new WarehouseStockLedgerEntry();
            entry.setAgencyId(res.getAgencyId());
            entry.setArticleId(res.getArticleId());
            entry.setMovementType("RESERVATION_RELEASE");
            entry.setQuantityDelta(0);
            entry.setOnHandBefore(pos.getOnHandQuantity());
            entry.setOnHandAfter(pos.getOnHandQuantity());
            entry.setReservedBefore(reservedBefore);
            entry.setReservedAfter(pos.getReservedQuantity());
            entry.setReferenceType(reservationType.name());
            entry.setReferenceId(referenceId);
            entry.setReferenceCode(res.getReferenceCode());
            entry.setBeneficiary(res.getBeneficiary());
            entry.setReason("Libération de réservation " + (res.getReferenceCode() != null ? res.getReferenceCode() : referenceId));
            entry.setPerformedBy(performedBy);
            entry.setOperationDate(LocalDate.now(ZoneOffset.UTC));
            entry.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
            ledgerRepository.save(entry);
        }
    }

    /**
     * Exécute une sortie physique du stock magasin (livraison demande commerciale, vente comptant, transfert sortant, perte/ajustement),
     * consomme la réservation éventuelle et journalise dans {@link WarehouseStockLedgerEntry}.
     */
    public WarehouseStockLedgerEntry recordStockRelease(
            Long agencyId,
            Articles article,
            int quantityToDeliver,
            int reservedQuantityConsumed,
            Double unitCost,
            String movementType,
            String referenceType,
            Long referenceId,
            String referenceCode,
            String beneficiary,
            String reason,
            String performedBy) {
        if (quantityToDeliver <= 0) {
            throw new CustomValidationException("La quantité de sortie magasin doit être strictement positive.");
        }
        Long effectiveAgencyId = resolveAgencyId(agencyId);
        WarehouseStockPosition pos = lockOrCreatePosition(effectiveAgencyId, article.getId());
        int onHandBefore = pos.getOnHandQuantity();
        int reservedBefore = pos.getReservedQuantity();

        if (reservedQuantityConsumed > 0) {
            pos.releaseReserved(reservedQuantityConsumed);
        }
        if (pos.availableQuantity() < (quantityToDeliver - Math.min(reservedBefore, Math.max(0, reservedQuantityConsumed)))) {
            // Vérification que la quantité non réservée tient dans le disponible
            if (pos.getOnHandQuantity() < quantityToDeliver) {
                throw new CustomValidationException("Stock physique magasin insuffisant pour l'article "
                        + article.getCommercialName() + " (en stock : " + pos.getOnHandQuantity()
                        + ", demandé : " + quantityToDeliver + ").");
            }
        }
        pos.deductOnHand(quantityToDeliver);
        positionRepository.saveAndFlush(pos);

        syncLegacyArticleCounters(article);

        WarehouseStockLedgerEntry entry = new WarehouseStockLedgerEntry();
        entry.setAgencyId(effectiveAgencyId);
        entry.setArticleId(article.getId());
        entry.setMovementType(movementType != null ? movementType : "SORTIE");
        entry.setQuantityDelta(-quantityToDeliver);
        entry.setOnHandBefore(onHandBefore);
        entry.setOnHandAfter(pos.getOnHandQuantity());
        entry.setReservedBefore(reservedBefore);
        entry.setReservedAfter(pos.getReservedQuantity());
        entry.setUnitCost(unitCost);
        entry.setTotalCost(unitCost != null ? unitCost * quantityToDeliver : null);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setReferenceCode(referenceCode);
        entry.setBeneficiary(beneficiary);
        entry.setReason(reason);
        entry.setPerformedBy(performedBy);
        entry.setOperationDate(LocalDate.now(ZoneOffset.UTC));
        entry.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        return ledgerRepository.save(entry);
    }

    /**
     * Synchronise les compteurs dépréciés {@code Articles.stockQuantity} et {@code Articles.reservedQuantity}
     * avec la position de l'agence courante (ou la somme des positions si mono-agence) afin que le code legacy reste cohérent.
     */
    public void syncLegacyArticleCounters(Articles article) {
        Integer totalOnHand = positionRepository.sumOnHandByArticleId(article.getId());
        Integer totalReserved = positionRepository.sumReservedByArticleId(article.getId());
        article.setStockQuantity(totalOnHand != null ? totalOnHand : 0);
        article.setReservedQuantity(totalReserved != null ? totalReserved : 0);
        articlesRepository.save(article);
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockPosition> getPositionsByAgency(Long agencyId) {
        return positionRepository.findByAgencyId(resolveAgencyId(agencyId));
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockReservation> getOpenReservationsByAgency(Long agencyId) {
        return reservationRepository.findByAgencyIdAndStatusInOrderByCreatedAtDesc(
                resolveAgencyId(agencyId), OPEN_RESERVATION_STATUSES);
    }

    @Transactional(readOnly = true)
    public Page<WarehouseStockLedgerEntry> searchLedger(
            Long agencyId,
            Long articleId,
            String movementType,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {
        Long effectiveAgencyId = AgencyContext.getCurrentAgencyId() != null
                ? AgencyContext.getCurrentAgencyId()
                : agencyId;
        return ledgerRepository.search(effectiveAgencyId, articleId, movementType, startDate, endDate, pageable);
    }
}
