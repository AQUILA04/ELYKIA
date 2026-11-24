package com.optimize.elykia.commercialstock.web;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.commercialstock.api.CommercialStockFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementView;
import com.optimize.elykia.commercialstock.api.CommercialStockPeriodRowView;
import com.optimize.elykia.commercialstock.api.CommercialStockPositionView;
import com.optimize.elykia.commercialstock.api.CommercialStockReportingFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockTeamRowView;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * API v2 du stock commercial continu. Un commercial (PROMOTER) ne voit que son propre stock ;
 * les actions de gestion (transfert, réalignement de prix) sont réservées au gestionnaire, au magasinier et aux admins.
 */
@RestController
@RequestMapping("/api/v2/commercial-stocks")
@CrossOrigin
public class CommercialStockController {

    private final CommercialStockFacade facade;
    private final CommercialStockReportingFacade reportingFacade;
    private final UserService userService;

    public CommercialStockController(CommercialStockFacade facade, CommercialStockReportingFacade reportingFacade,
                                     UserService userService) {
        this.facade = facade;
        this.reportingFacade = reportingFacade;
        this.userService = userService;
    }

    @GetMapping("/reports/period")
    public ResponseEntity<List<CommercialStockPeriodRowView>> periodReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) StockActivityType activityType) {
        return ResponseEntity.ok(reportingFacade.periodReport(startDate, endDate, scopedCollector(collector),
                activityType));
    }

    @GetMapping("/reports/team-overview")
    public ResponseEntity<List<CommercialStockTeamRowView>> teamOverview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) StockActivityType activityType) {
        return ResponseEntity.ok(reportingFacade.teamOverview(startDate, endDate, scopedCollector(collector),
                activityType));
    }

    @GetMapping("/positions")
    public ResponseEntity<List<CommercialStockPositionView>> positions(
            @RequestParam(required = false) String commercialUsername,
            @Deprecated @RequestParam(required = false) String collector,
            @RequestParam(required = false) StockActivityType activityType,
            @RequestParam(defaultValue = "true") boolean onlyPositive) {
        return ResponseEntity.ok(facade.getPositions(scopedCollector(resolveCommercial(commercialUsername, collector)), activityType, onlyPositive));
    }

    @GetMapping("/movements")
    public ResponseEntity<List<CommercialStockMovementView>> movements(
            @RequestParam(required = false) String commercialUsername,
            @Deprecated @RequestParam(required = false) String collector,
            @RequestParam(required = false) Long articleId,
            @RequestParam(required = false) StockActivityType activityType,
            @RequestParam(required = false) CommercialStockMovementType movementType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "200") int limit) {
        return ResponseEntity.ok(facade.getMovements(scopedCollector(resolveCommercial(commercialUsername, collector)), articleId, activityType, movementType,
                startDate, endDate, limit));
    }

    /** Transfert interne CREDIT ↔ TONTINE : aucun impact sur le stock magasin. */
    @PostMapping("/transfers")
    public ResponseEntity<Map<String, String>> transfer(@RequestBody TransferRequest request) {
        User user = requireManager();
        String transferId = facade.transferBetweenActivities(request.collector(), request.articleId(), request.from(),
                request.to(), request.quantity(), request.targetSalePrice(), request.accountingDate(), user.getUsername());
        return ResponseEntity.ok(Map.of("transferId", transferId));
    }

    /** Réaligne le prix de vente des couches ouvertes ; le coût d'achat FIFO n'est jamais modifié. */
    @PostMapping("/realign-prices")
    public ResponseEntity<Map<String, Integer>> realignPrices(@RequestBody RealignPricesRequest request) {
        User user = requireManager();
        if (request.newSalePrice() == null || request.newSalePrice() < 0) {
            throw new CustomValidationException("Le nouveau prix de vente est obligatoire et positif.");
        }
        int revalued = facade.realignSalePrices(request.articleId(), request.activityType(), request.collector(),
                request.newSalePrice(), user.getUsername());
        return ResponseEntity.ok(Map.of("revaluedQuantity", revalued));
    }

    public record TransferRequest(String collector, Long articleId, StockActivityType from, StockActivityType to,
                                  int quantity, Double targetSalePrice, LocalDate accountingDate) {
    }

    public record RealignPricesRequest(Long articleId, StockActivityType activityType, String collector,
                                       Double newSalePrice) {
    }

    private static String resolveCommercial(String commercialUsername, String deprecatedCollector) {
        return (commercialUsername != null && !commercialUsername.isBlank()) ? commercialUsername : deprecatedCollector;
    }

    private String scopedCollector(String requested) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        return requested != null && !requested.isBlank() ? requested : null;
    }

    private User requireManager() {
        User user = userService.getCurrentUser();
        boolean allowed = user.is(UserProfilConstant.SU) || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.GESTIONNAIRE) || user.is(UserProfilConstant.MAGASINIER);
        if (!allowed) {
            throw new CustomValidationException("Action réservée au gestionnaire, au magasinier et aux administrateurs.");
        }
        return user;
    }
}
