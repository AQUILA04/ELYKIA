package com.optimize.elykia.core.service.util;

import com.optimize.elykia.core.service.accounting.AccountingDayService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertSame;

@ExtendWith(MockitoExtension.class)
class SharedServiceTest {

    @Mock private AccountingDayService accountingDayService;

    @Test
    void getAccountingDayService_exposesTheInjectedSharedAccountingService() {
        // Given
        SharedService sharedService = new SharedService(accountingDayService);

        // When
        AccountingDayService returned = sharedService.getAccountingDayService();

        // Then
        assertSame(accountingDayService, returned);
    }
}
