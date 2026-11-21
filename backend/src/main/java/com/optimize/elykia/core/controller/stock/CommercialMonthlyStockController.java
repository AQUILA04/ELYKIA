package com.optimize.elykia.core.controller.stock;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.CommercialMonthlyStockItemSoldValueHistoryDto;
import com.optimize.elykia.core.dto.CommercialStockItemDto;
import com.optimize.elykia.core.dto.stock.StockLinkedSalesResponseDto;
import com.optimize.elykia.core.dto.stock.team.StockTeamOverviewDto;
import com.optimize.elykia.core.dto.stock.team.StockToSettleDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.stock.CommercialMonthlyStockItemSoldValueHistoryService;
import com.optimize.elykia.core.service.stock.CommercialStockTeamService;
import com.optimize.elykia.core.service.stock.StockExportService;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * Stock mensuel des commerciaux. Un commercial (PROMOTER) n'accède qu'à son propre stock,
 * quel que soit le commercial demandé.
 */
@RestController
@RequestMapping("/api/commercial-stocks")
@CrossOrigin
public class CommercialMonthlyStockController {

    private final CommercialMonthlyStockRepository repository;
    private final CommercialMonthlyStockService monthlyStockService;
    private final CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService;
    private final StockExportService stockExportService;
    private final CommercialStockTeamService teamService;
    private final UserService userService;

    public CommercialMonthlyStockController(CommercialMonthlyStockRepository repository,
                                            CommercialMonthlyStockService monthlyStockService,
                                            CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService,
                                            StockExportService stockExportService,
                                            CommercialStockTeamService teamService,
                                            UserService userService) {
        this.repository = repository;
        this.monthlyStockService = monthlyStockService;
        this.soldValueHistoryService = soldValueHistoryService;
        this.stockExportService = stockExportService;
        this.teamService = teamService;
        this.userService = userService;
    }

    @GetMapping("/current/{collector}")
    public ResponseEntity<CommercialMonthlyStock> getCurrentMonthStock(@PathVariable String collector) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.of(monthlyStockService.findEnrichedByCollectorAndMonthAndYear(
                scopedCollector(collector), now.getMonthValue(), now.getYear()));
    }

    /** Vue équipe d'un mois : une ligne par commercial et les totaux (un commercial : sa seule ligne). */
    @GetMapping("/team-overview")
    public ResponseEntity<StockTeamOverviewDto> getTeamOverview(
            @RequestParam Integer year,
            @RequestParam Integer month,
            @RequestParam(required = false) String collector) {
        if (month < 1 || month > 12) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(teamService.overview(year, month, scopedCollectorOrNull(collector), LocalDate.now()));
    }

    /** Mois clôturés dont le reste n'est ni retourné ni transformé en dette. */
    @GetMapping("/to-settle")
    public ResponseEntity<List<StockToSettleDto>> getToSettle(@RequestParam(required = false) String collector) {
        return ResponseEntity.ok(teamService.toSettle(scopedCollectorOrNull(collector), LocalDate.now()));
    }

    @GetMapping("/{stockId}/linked-sales")
    public ResponseEntity<StockLinkedSalesResponseDto> getLinkedSales(@PathVariable Long stockId) {
        assertCanReadStock(stockId);
        return ResponseEntity.ok(monthlyStockService.getLinkedSales(stockId));
    }

    @GetMapping("/{collector}/{year}/{month}")
    public ResponseEntity<CommercialMonthlyStock> getStockByDate(
            @PathVariable String collector,
            @PathVariable Integer year,
            @PathVariable Integer month) {
        return ResponseEntity.of(monthlyStockService.findEnrichedByCollectorAndMonthAndYear(
                scopedCollector(collector), month, year));
    }

    @GetMapping("/available/{collector}")
    public ResponseEntity<List<CommercialStockItemDto>> getAvailableItems(@PathVariable String collector) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.ok(repository.findAvailableItemsByCollector(
                scopedCollector(collector), now.getMonthValue(), now.getYear()));
    }

    @GetMapping("/items/{stockItemId}/sold-value-history")
    public ResponseEntity<List<CommercialMonthlyStockItemSoldValueHistoryDto>> getSoldValueHistory(
            @PathVariable Long stockItemId) {
        return ResponseEntity.ok(soldValueHistoryService.getByStockItemId(stockItemId));
    }

    @GetMapping
    public ResponseEntity<Page<CommercialMonthlyStock>> getAll(String collector, Pageable pageable, Boolean historic) {
        return ResponseEntity.ok(monthlyStockService.getAll(collector, pageable, historic));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) String collector,
            @RequestParam Integer year,
            @RequestParam Integer month) {

        byte[] pdfContent = stockExportService.generateDashboardPdfExport(collector, year, month);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
                "attachment",
                "rapport-stock-commercial-" + collector + "-" + year + "-" + month + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok(pdfContent);
    }

    /** Un commercial ne voit que son stock ; les autres profils, le commercial demandé. */
    private String scopedCollector(String requested) {
        User user = userService.getCurrentUser();
        return user.is(UserProfilConstant.PROMOTER) ? user.getUsername() : requested;
    }

    private String scopedCollectorOrNull(String requested) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        return requested != null && !requested.isBlank() ? requested : null;
    }

    private void assertCanReadStock(Long stockId) {
        User user = userService.getCurrentUser();
        if (!user.is(UserProfilConstant.PROMOTER)) {
            return;
        }
        String owner = repository.findById(stockId).map(CommercialMonthlyStock::getCollector).orElse(null);
        if (owner == null || !owner.equalsIgnoreCase(user.getUsername())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Stock d'un autre commercial.");
        }
    }
}
