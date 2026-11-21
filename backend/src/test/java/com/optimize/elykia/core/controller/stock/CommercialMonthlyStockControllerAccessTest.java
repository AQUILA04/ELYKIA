package com.optimize.elykia.core.controller.stock;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.stock.CommercialMonthlyStockItemSoldValueHistoryService;
import com.optimize.elykia.core.service.stock.CommercialStockTeamService;
import com.optimize.elykia.core.service.stock.StockExportService;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Un commercial (PROMOTER) n'accède qu'à son propre stock, quel que soit le commercial demandé. */
@ExtendWith(MockitoExtension.class)
class CommercialMonthlyStockControllerAccessTest {

    @Mock private CommercialMonthlyStockRepository repository;
    @Mock private CommercialMonthlyStockService monthlyStockService;
    @Mock private CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService;
    @Mock private StockExportService stockExportService;
    @Mock private CommercialStockTeamService teamService;
    @Mock private UserService userService;
    @Mock private User user;

    private CommercialMonthlyStockController controller;

    @BeforeEach
    void setUp() {
        controller = new CommercialMonthlyStockController(repository, monthlyStockService, soldValueHistoryService,
                stockExportService, teamService, userService);
        lenient().when(userService.getCurrentUser()).thenReturn(user);
        lenient().when(user.getUsername()).thenReturn("COM012");
    }

    private void asPromoter(boolean promoter) {
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(promoter);
    }

    @Test
    void aCommercialAskingForAnotherStockGetsOnlyHisOwn() {
        asPromoter(true);
        when(monthlyStockService.findEnrichedByCollectorAndMonthAndYear("COM012", 10, 2026)).thenReturn(Optional.empty());

        controller.getStockByDate("COM006", 2026, 10);

        verify(monthlyStockService).findEnrichedByCollectorAndMonthAndYear("COM012", 10, 2026);
        verify(monthlyStockService, never()).findEnrichedByCollectorAndMonthAndYear(eq("COM006"), anyInt(), anyInt());
    }

    @Test
    void aManagerGetsTheRequestedCommercial() {
        asPromoter(false);
        when(monthlyStockService.findEnrichedByCollectorAndMonthAndYear("COM006", 10, 2026)).thenReturn(Optional.empty());

        controller.getStockByDate("COM006", 2026, 10);

        verify(monthlyStockService).findEnrichedByCollectorAndMonthAndYear("COM006", 10, 2026);
    }

    @Test
    void teamOverviewIsScopedToTheCommercialAndToTheWholeTeamForAManager() {
        asPromoter(true);
        controller.getTeamOverview(2026, 11, "COM006");
        verify(teamService).overview(eq(2026), eq(11), eq("COM012"), any(LocalDate.class));

        asPromoter(false);
        controller.getTeamOverview(2026, 11, null);
        verify(teamService).overview(eq(2026), eq(11), isNull(), any(LocalDate.class));
    }

    @Test
    void teamOverviewRejectsAnInvalidMonth() {
        assertEquals(HttpStatus.BAD_REQUEST, controller.getTeamOverview(2026, 13, null).getStatusCode());
    }

    @Test
    void linkedSalesOfAnotherCommercialAreForbiddenForACommercial() {
        asPromoter(true);
        CommercialMonthlyStock other = new CommercialMonthlyStock();
        other.setCollector("COM006");
        when(repository.findById(40L)).thenReturn(Optional.of(other));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller.getLinkedSales(40L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(monthlyStockService, never()).getLinkedSales(any());
    }

    @Test
    void toSettleIsScopedToTheCommercial() {
        asPromoter(true);
        when(teamService.toSettle(eq("COM012"), any(LocalDate.class))).thenReturn(List.of());

        controller.getToSettle(null);

        verify(teamService).toSettle(eq("COM012"), any(LocalDate.class));
    }
}
