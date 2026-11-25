package com.optimize.elykia.commercialstock.api;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

/**
 * Façade publique du module {@code commercialstock} pour la gestion unifiée des Demandes de Sortie
 * ({@code CommercialStockRequest}) et des Retours de Stock ({@code CommercialStockReturn}),
 * couvrant les activités {@code CREDIT} et {@code TONTINE}.
 */
public interface CommercialStockRequestFacade {

    record RequestLineInput(
            Long articleId,
            int quantity,
            Double unitSalePrice,
            Double unitPurchaseCost) {
    }

    record CreateRequestCommand(
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            Long tontineSessionId,
            String note,
            Long legacyCreditRequestId,
            Long legacyTontineRequestId,
            List<RequestLineInput> items) {
    }

    record CommercialStockRequestView(
            Long id,
            String reference,
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            Long tontineSessionId,
            CommercialStockRequestStatus status,
            LocalDate requestDate,
            LocalDate validationDate,
            LocalDate deliveryDate,
            LocalDate accountingDate,
            double totalSalePrice,
            double totalPurchasePrice,
            String note,
            Long parentRequestId,
            Long legacyCreditRequestId,
            Long legacyTontineRequestId,
            List<RequestItemView> items) {
    }

    record RequestItemView(
            Long id,
            Long articleId,
            String itemName,
            int quantityRequested,
            int quantityReserved,
            int quantityDelivered,
            int shortageQuantity,
            double unitSalePrice,
            double unitPurchaseCost) {
    }

    record DeliveryOutcomeView(
            boolean partialDelivery,
            CommercialStockRequestView deliveredRequest,
            CommercialStockRequestView childBackorderRequest) {
    }

    record CreateReturnCommand(
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            Long tontineSessionId,
            String note,
            Long legacyCreditReturnId,
            Long legacyTontineReturnId,
            List<RequestLineInput> items) {
    }

    record CommercialStockReturnView(
            Long id,
            String reference,
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            Long tontineSessionId,
            CommercialStockReturnStatus status,
            LocalDate returnDate,
            LocalDate receivedDate,
            String receivedBy,
            String note,
            Long legacyCreditReturnId,
            Long legacyTontineReturnId,
            List<ReturnItemView> items) {
    }

    record ReturnItemView(
            Long id,
            Long articleId,
            String itemName,
            int quantity,
            double unitSalePrice,
            double unitPurchaseCost) {
    }

    CommercialStockRequestView createRequest(CreateRequestCommand command);

    CommercialStockRequestView validateRequest(Long requestId);

    DeliveryOutcomeView deliverRequest(Long requestId);

    CommercialStockRequestView cancelRequest(Long requestId);

    CommercialStockRequestView refuseRequest(Long requestId);

    CommercialStockRequestView getRequestById(Long requestId);

    Page<CommercialStockRequestView> searchRequests(
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            CommercialStockRequestStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable);

    CommercialStockReturnView createReturn(CreateReturnCommand command);

    CommercialStockReturnView validateReturn(Long returnId);

    CommercialStockReturnView cancelReturn(Long returnId);

    CommercialStockReturnView refuseReturn(Long returnId);

    CommercialStockReturnView getReturnById(Long returnId);

    Page<CommercialStockReturnView> searchReturns(
            Long agencyId,
            String commercialUsername,
            StockActivityType activityType,
            CommercialStockReturnStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable);

    /**
     * Synchronise (crée ou met à jour) une demande legacy {@code StockRequest} ou {@code StockTontineRequest}
     * vers {@code CommercialStockRequest} + réservation magasin Option A.
     */
    void syncLegacyRequestState(
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
            List<RequestLineInput> items);

    /**
     * Synchronise un retour legacy {@code StockReturn} ou {@code StockTontineReturn}
     * vers {@code CommercialStockReturn}.
     */
    void syncLegacyReturnState(
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
            List<RequestLineInput> items);
}
