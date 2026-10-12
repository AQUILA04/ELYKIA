package com.optimize.elykia.core.service.debt;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.debt.DebtDocumentDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.DebtType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.DebtDocumentRepository;
import com.optimize.elykia.core.repository.DebtSettlementRepository;
import com.optimize.elykia.core.util.UserPermissionConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DebtServiceMerchandiseTest {

    @Mock private DebtDocumentRepository debtDocumentRepository;
    @Mock private DebtSettlementRepository debtSettlementRepository;
    @Mock private CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    @Mock private DailyCommercialReportRepository dailyCommercialReportRepository;
    @Mock private CreditRepository creditRepository;
    @Mock private UserService userService;

    private DebtService debtService;

    @BeforeEach
    void setUp() {
        debtService = new DebtService(
                debtDocumentRepository,
                debtSettlementRepository,
                commercialMonthlyStockRepository,
                dailyCommercialReportRepository,
                creditRepository,
                userService);
        User user = mock(User.class);
        UserPermission permission = mock(UserPermission.class);
        when(permission.getName()).thenReturn(UserPermissionConstant.DEBT_MANAGEMENT);
        when(user.getPermissions()).thenReturn(Set.of(permission));
        when(user.getUsername()).thenReturn("gestionnaire");
        when(userService.getCurrentUser()).thenReturn(user);
        when(debtDocumentRepository.existsByReference(anyString())).thenReturn(false);
        when(debtDocumentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createMerchandiseDebt_movesRemainingToDebtAndKeepsTotalDueIdentity() {
        YearMonth past = YearMonth.now().minusMonths(1);
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setId(10L);
        stock.setCollector("promo1");
        stock.setYear(past.getYear());
        stock.setMonth(past.getMonthValue());

        Articles article = new Articles();
        article.setId(1L);
        article.setName("Article A");
        article.setMarque("Art");
        article.setModel("A");

        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setId(100L);
        item.setArticle(article);
        item.setQuantityTaken(10);
        item.setQuantitySold(5);
        item.setQuantityReturned(3);
        item.setQuantityRemaining(2);
        item.setQuantityDebt(0);
        item.setWeightedAverageUnitPrice(1000.0);
        item.setTotalSoldValue(5000.0);
        stock.setItems(new HashSet<>(Set.of(item)));

        when(commercialMonthlyStockRepository.findByIdWithItems(10L)).thenReturn(Optional.of(stock));
        when(debtDocumentRepository.findByMonthlyStockIdAndDebtTypeAndStatusNot(any(), any(), any()))
                .thenReturn(Optional.empty());

        double dueBefore = item.getTotalSoldValue()
                + item.getQuantityRemaining() * item.getWeightedAverageUnitPrice();

        DebtDocumentDto dto = debtService.createMerchandiseDebt(10L);

        assertEquals(2, item.getQuantityDebt());
        assertEquals(0, item.getQuantityRemaining());
        assertEquals(1000.0, item.getDebtUnitPrice());
        assertEquals(2000.0, dto.getGrossAmount());
        assertEquals(DebtType.MERCHANDISE, dto.getDebtType());

        double dueAfter = item.getTotalSoldValue()
                + item.debtValue()
                + item.getQuantityRemaining() * item.getWeightedAverageUnitPrice();
        assertEquals(dueBefore, dueAfter);
        verify(commercialMonthlyStockRepository).save(stock);
    }

    @Test
    void createMerchandiseDebt_rejectsCurrentMonth() {
        LocalDate now = LocalDate.now();
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setId(11L);
        stock.setCollector("promo1");
        stock.setYear(now.getYear());
        stock.setMonth(now.getMonthValue());
        when(commercialMonthlyStockRepository.findByIdWithItems(11L)).thenReturn(Optional.of(stock));

        assertThrows(CustomValidationException.class, () -> debtService.createMerchandiseDebt(11L));
    }

    @Test
    void createMerchandiseDebt_rejectsWithoutPermission() {
        User user = mock(User.class);
        when(user.getPermissions()).thenReturn(Set.of());
        when(userService.getCurrentUser()).thenReturn(user);

        assertThrows(CustomValidationException.class, () -> debtService.createMerchandiseDebt(1L));
    }
}
