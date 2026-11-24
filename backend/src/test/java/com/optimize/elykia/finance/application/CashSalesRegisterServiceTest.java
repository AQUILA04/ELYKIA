package com.optimize.elykia.finance.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.finance.domain.CashSalesRegisterEntry;
import com.optimize.elykia.finance.domain.CashSalesRegisterEntryType;
import com.optimize.elykia.finance.domain.CashSalesRegisterSession;
import com.optimize.elykia.finance.domain.CashSalesRegisterStatus;
import com.optimize.elykia.finance.infrastructure.persistence.CashSalesRegisterEntryRepository;
import com.optimize.elykia.finance.infrastructure.persistence.CashSalesRegisterSessionRepository;
import com.optimize.elykia.finance.web.dto.CashSalesRegisterSummaryDto;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CashSalesRegisterServiceTest {

    private CashSalesRegisterSessionRepository sessionRepository;
    private CashSalesRegisterEntryRepository entryRepository;
    private UserService userService;
    private CashSalesRegisterService service;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(CashSalesRegisterSessionRepository.class);
        entryRepository = mock(CashSalesRegisterEntryRepository.class);
        userService = mock(UserService.class);
        service = new CashSalesRegisterService(sessionRepository, entryRepository, userService);
        when(sessionRepository.save(any())).thenAnswer(inv -> {
            CashSalesRegisterSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(1L);
            return s;
        });
    }

    private User userWithProfile(String profile) {
        User u = mock(User.class);
        when(u.getUsername()).thenReturn("u." + profile.toLowerCase());
        when(u.is(profile)).thenReturn(true);
        return u;
    }

    @Test
    void roleMatrix_allowsCashierSecretaryManagerAndAdminsToSell_andBlocksSecretaryFromClosing() {
        assertTrue(CashSalesRegisterService.canSellAtCashRegister(userWithProfile(UserProfilConstant.CASHIER)));
        assertTrue(CashSalesRegisterService.canSellAtCashRegister(userWithProfile(UserProfilConstant.SECRETARY)));
        assertTrue(CashSalesRegisterService.canSellAtCashRegister(userWithProfile(UserProfilConstant.GESTIONNAIRE)));
        assertTrue(CashSalesRegisterService.canSellAtCashRegister(userWithProfile(UserProfilConstant.ADMIN)));
        assertTrue(CashSalesRegisterService.canSellAtCashRegister(userWithProfile(UserProfilConstant.SU)));
        assertFalse(CashSalesRegisterService.canSellAtCashRegister(userWithProfile(UserProfilConstant.PROMOTER)));

        assertTrue(CashSalesRegisterService.canManageCashRegister(userWithProfile(UserProfilConstant.CASHIER)));
        assertTrue(CashSalesRegisterService.canManageCashRegister(userWithProfile(UserProfilConstant.GESTIONNAIRE)));
        assertTrue(CashSalesRegisterService.canManageCashRegister(userWithProfile(UserProfilConstant.ADMIN)));
        assertFalse(CashSalesRegisterService.canManageCashRegister(userWithProfile(UserProfilConstant.SECRETARY)));
    }

    @Test
    void openReceiptReversalAndClose_computesExpectedClosingAndDiscrepancy() {
        User cashier = userWithProfile(UserProfilConstant.CASHIER);
        when(userService.getCurrentUser()).thenReturn(cashier);
        when(sessionRepository.findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus.OPEN))
                .thenReturn(Optional.empty());

        CashSalesRegisterSession opened = service.openSession(10_000.0);
        when(sessionRepository.findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus.OPEN))
                .thenReturn(Optional.of(opened));

        service.recordCashSaleReceipt(11L, "CSH-1", 25_000.0, 1L, "Client A", "agency", "sec.1", LocalDate.now());
        service.recordCashSaleReversal(11L, "CSH-1", 5_000.0, 1L, "Client A", "agency", "sec.1", LocalDate.now());

        assertEquals(30_000.0, opened.getExpectedClosing(), 0.001);

        CashSalesRegisterSession closed = service.closeSession(null, 29_500.0, "Manquant 500");
        assertEquals(CashSalesRegisterStatus.CLOSED, closed.getStatus());
        assertEquals(-500.0, closed.getDiscrepancy(), 0.001);
    }

    @Test
    void secretary_cannotOpenOrCloseSession() {
        User secretary = userWithProfile(UserProfilConstant.SECRETARY);
        when(userService.getCurrentUser()).thenReturn(secretary);
        assertThrows(CustomValidationException.class, () -> service.openSession(0));
    }

    @Test
    void getReport_summarizesReceiptsAndReversalsForDailyReport() {
        LocalDate d = LocalDate.of(2026, 11, 24);
        CashSalesRegisterEntry e1 = new CashSalesRegisterEntry();
        e1.setEntryType(CashSalesRegisterEntryType.RECEIPT);
        e1.setAmount(15_000.0);
        CashSalesRegisterEntry e2 = new CashSalesRegisterEntry();
        e2.setEntryType(CashSalesRegisterEntryType.REVERSAL);
        e2.setAmount(3_000.0);
        when(sessionRepository.findBySessionDateBetweenOrderBySessionDateDescOpenedAtDesc(d, d)).thenReturn(List.of());
        when(entryRepository.findByAccountingDateBetweenOrderByOccurredAtDescIdDesc(d, d)).thenReturn(List.of(e1, e2));

        CashSalesRegisterSummaryDto summary = service.getReport(d, d);
        assertEquals(1, summary.receiptsCount());
        assertEquals(1, summary.reversalsCount());
        assertEquals(12_000.0, summary.netSalesAmount(), 0.001);
    }
}
