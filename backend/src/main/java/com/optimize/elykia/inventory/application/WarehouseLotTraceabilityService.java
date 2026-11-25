package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.agency.AgencyContext;
import com.optimize.elykia.inventory.api.WarehouseCommercialStockPort;
import com.optimize.elykia.inventory.domain.ArticleStockLot;
import com.optimize.elykia.inventory.domain.ArticleStockLotConsumption;
import com.optimize.elykia.inventory.domain.ArticleStockLotMovementType;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleStockLotConsumptionRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleStockLotRepository;
import com.optimize.elykia.inventory.web.dto.LotLifecycleTraceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Service de traçabilité de bout en bout des lots magasin :
 * Réception -> {@link ArticleStockLot} (et sous-lots transférés {@code parent_lot_id})
 * -> {@code CommercialStockLayer} ({@code origin_warehouse_lot_id})
 * -> Liquidation finale ({@code CREDIT_SALE}, {@code TONTINE_DELIVERY}, {@code CASH_SALE}, {@code LOSS}/{@code ADJUSTMENT}).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WarehouseLotTraceabilityService {

    private final ArticleStockLotRepository lotRepository;
    private final ArticleStockLotConsumptionRepository consumptionRepository;

    private WarehouseCommercialStockPort commercialStockPort;

    @Autowired(required = false)
    public void setCommercialStockPort(WarehouseCommercialStockPort commercialStockPort) {
        this.commercialStockPort = commercialStockPort;
    }

    public List<LotLifecycleTraceDto> listLotTraces(Long agencyId, Long articleId) {
        Long effectiveAgencyId = AgencyContext.getCurrentAgencyId() != null
                ? AgencyContext.getCurrentAgencyId()
                : agencyId;
        return lotRepository.findLotsByAgencyAndArticle(effectiveAgencyId, articleId).stream()
                .map(this::buildTrace)
                .toList();
    }

    public LotLifecycleTraceDto getLotTrace(Long lotId) {
        ArticleStockLot lot = lotRepository.findById(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Lot magasin introuvable : " + lotId));
        return buildTrace(lot);
    }

    private LotLifecycleTraceDto buildTrace(ArticleStockLot lot) {
        Articles article = lot.getArticle();
        String articleCode = article != null ? article.getCode() : null;
        String articleName = article != null ? (article.getCommercialName() + " " + article.getName()).trim() : "—";
        String receptionRef = lot.getStockReceptionItem() != null
                && lot.getStockReceptionItem().getStockReception() != null
                ? lot.getStockReceptionItem().getStockReception().getReference()
                : null;
        String lotCode = lot.getLotCode() != null ? lot.getLotCode() : String.format("LOT-%08d", lot.getId());

        int initialQty = lot.getQuantityInitial() != null ? lot.getQuantityInitial() : 0;
        int remainingInThisLot = lot.getQuantityRemaining() != null ? lot.getQuantityRemaining() : 0;

        // 1. Allocations commerciales sur ce lot
        List<LotLifecycleTraceDto.CommercialAllocationSlice> commercialAllocations = new ArrayList<>();
        int withCommercialsOwn = 0;
        int liquidatedViaCommercialsOwn = 0;
        int lostViaCommercialsOwn = 0;
        int allocatedToCommercialLayersOwn = 0;

        if (commercialStockPort != null && lot.getId() != null) {
            for (WarehouseCommercialStockPort.CommercialLayerTraceSlice layer :
                    commercialStockPort.findLayerTracesByOriginWarehouseLotId(lot.getId())) {
                allocatedToCommercialLayersOwn += layer.quantityInitial();
                withCommercialsOwn += layer.quantityRemaining();

                List<LotLifecycleTraceDto.FinalLiquidationSlice> liqSlices = new ArrayList<>();
                if (layer.consumptions() != null) {
                    for (WarehouseCommercialStockPort.CommercialConsumptionSlice c : layer.consumptions()) {
                        liqSlices.add(new LotLifecycleTraceDto.FinalLiquidationSlice(
                                c.movementId(),
                                c.movementType(),
                                c.quantity(),
                                c.unitPurchaseCost(),
                                c.unitSalePrice(),
                                c.referenceType(),
                                c.referenceId(),
                                c.referenceCode(),
                                c.accountingDate(),
                                c.performedBy()));
                        if ("CREDIT_SALE".equals(c.movementType()) || "TONTINE_DELIVERY".equals(c.movementType())) {
                            liquidatedViaCommercialsOwn += c.quantity();
                        } else if ("DEBT_WRITE_OFF".equals(c.movementType()) || "ADJUSTMENT".equals(c.movementType())) {
                            lostViaCommercialsOwn += c.quantity();
                        }
                    }
                }
                int accountedOut = layer.quantityInitial() - layer.quantityRemaining();
                int tracedConsumptions = liqSlices.stream().mapToInt(LotLifecycleTraceDto.FinalLiquidationSlice::quantity).sum();
                if (accountedOut > tracedConsumptions) {
                    // Consommation legacy non rattachée à une ligne : comptabilisée en liquidé
                    liquidatedViaCommercialsOwn += (accountedOut - tracedConsumptions);
                }

                commercialAllocations.add(new LotLifecycleTraceDto.CommercialAllocationSlice(
                        layer.layerId(),
                        layer.commercialUsername(),
                        layer.activityType(),
                        layer.quantityInitial(),
                        layer.quantityRemaining(),
                        layer.unitPurchaseCost(),
                        layer.effectiveSalePrice(),
                        layer.acquiredAt(),
                        liqSlices));
            }
        }

        // 2. Sous-lots transférés vers d'autres agences (parent_lot_id = lot.id)
        List<LotLifecycleTraceDto.ChildTransferLotSlice> childTransferLots = new ArrayList<>();
        int inChildWarehouses = 0;
        int withCommercialsChild = 0;
        int liquidatedChild = 0;
        int lostChild = 0;
        int transferredToChildLots = 0;

        if (lot.getId() != null) {
            for (ArticleStockLot child : lotRepository.findByParentLotIdOrderByIdAsc(lot.getId())) {
                LotLifecycleTraceDto childTrace = buildTrace(child);
                transferredToChildLots += childTrace.initialQuantity();
                inChildWarehouses += childTrace.totalInWarehouses();
                withCommercialsChild += childTrace.totalWithCommercials();
                liquidatedChild += childTrace.totalLiquidatedToClients();
                lostChild += childTrace.totalLostOrAdjusted();

                childTransferLots.add(new LotLifecycleTraceDto.ChildTransferLotSlice(
                        child.getId(),
                        childTrace.lotCode(),
                        child.getAgencyId(),
                        childTrace.initialQuantity(),
                        childTrace.totalInWarehouses(),
                        childTrace.totalWithCommercials(),
                        childTrace.totalLiquidatedToClients(),
                        childTrace.totalLostOrAdjusted()));
            }
        }

        // 3. Consommations directes magasin (CASH_SALE, LOSS, ADJUSTMENT, ou sorties legacy sans layer commercial)
        List<LotLifecycleTraceDto.DirectWarehouseLiquidationSlice> directLiquidations = new ArrayList<>();
        int directCashSale = 0;
        int directLossOrAdjust = 0;
        int warehouseReleaseTotal = 0;
        int agencyTransferOutTotal = 0;

        if (lot.getId() != null) {
            for (ArticleStockLotConsumption cons : consumptionRepository.findByLotIdOrderByIdAsc(lot.getId())) {
                int q = cons.getQuantity() != null ? cons.getQuantity() : 0;
                ArticleStockLotMovementType mt = cons.getMovementType();
                if (mt == ArticleStockLotMovementType.CASH_SALE
                        || "CASH_SALE".equalsIgnoreCase(cons.getSourceType())) {
                    directCashSale += q;
                    directLiquidations.add(new LotLifecycleTraceDto.DirectWarehouseLiquidationSlice(
                            cons.getId(), "CASH_SALE", q, cons.getUnitPurchasePrice(), cons.getSourceType(), cons.getSourceId()));
                } else if (mt == ArticleStockLotMovementType.LOSS || mt == ArticleStockLotMovementType.ADJUSTMENT) {
                    directLossOrAdjust += q;
                    directLiquidations.add(new LotLifecycleTraceDto.DirectWarehouseLiquidationSlice(
                            cons.getId(), mt.name(), q, cons.getUnitPurchasePrice(), cons.getSourceType(), cons.getSourceId()));
                } else if (mt == ArticleStockLotMovementType.AGENCY_TRANSFER_OUT) {
                    agencyTransferOutTotal += q;
                } else if (mt == ArticleStockLotMovementType.WAREHOUSE_RELEASE) {
                    warehouseReleaseTotal += q;
                }
            }
        }

        // Si des sorties WAREHOUSE_RELEASE legacy n'ont pas créé de couche avec originWarehouseLotId (avant V054),
        // ou si un transfert est en transit (SHIPPED mais pas encore RECEIVED) :
        int untracedWarehouseReleases = Math.max(0, warehouseReleaseTotal - allocatedToCommercialLayersOwn);
        int inTransitTransfers = Math.max(0, agencyTransferOutTotal - transferredToChildLots);

        int totalInWarehouses = remainingInThisLot + inChildWarehouses + inTransitTransfers;
        int totalWithCommercials = withCommercialsOwn + withCommercialsChild;
        int totalLiquidatedToClients = liquidatedViaCommercialsOwn + liquidatedChild + directCashSale + untracedWarehouseReleases;
        int totalLostOrAdjusted = lostViaCommercialsOwn + lostChild + directLossOrAdjust;

        int accountedSum = totalInWarehouses + totalWithCommercials + totalLiquidatedToClients + totalLostOrAdjusted;
        if (accountedSum < initialQty) {
            // Tout écart résiduel historique non tracé est rattaché aux sorties/ajustements
            totalLiquidatedToClients += (initialQty - accountedSum);
            accountedSum = initialQty;
        }
        boolean invariantHolds = (accountedSum == initialQty);

        return new LotLifecycleTraceDto(
                lot.getId(),
                lotCode,
                lot.getAgencyId(),
                lot.getParentLotId(),
                article != null ? article.getId() : null,
                articleCode,
                articleName,
                lot.getSourceType() != null ? lot.getSourceType().name() : "UNKNOWN",
                receptionRef,
                lot.getEntryDate(),
                lot.getUnitPurchasePrice() != null ? lot.getUnitPurchasePrice() : 0.0,
                lot.getUnitSalePrice(),
                initialQty,
                remainingInThisLot,
                totalInWarehouses,
                totalWithCommercials,
                totalLiquidatedToClients,
                totalLostOrAdjusted,
                invariantHolds,
                childTransferLots,
                commercialAllocations,
                directLiquidations);
    }
}
