package com.optimize.elykia.core.service.util;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.MobileTransaction;
import com.optimize.elykia.core.repository.MobileTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MobileTransactionServiceTest {

    @Mock private MobileTransactionRepository mobileTransactionRepository;

    @Test
    void getAllTransactionByCommercial_filtersRepositoryQueryToEnabledTransactionsForTheRequestedCommercial() {
        // Given
        MobileTransactionService service = new MobileTransactionService(mobileTransactionRepository);
        List<MobileTransaction> enabledTransactions = List.of(new MobileTransaction(), new MobileTransaction());
        when(mobileTransactionRepository.findByCommercialIdAndState("commercial.a", State.ENABLED))
                .thenReturn(enabledTransactions);

        // When
        List<MobileTransaction> returned = service.getAllTransactionByCommercial("commercial.a");

        // Then
        assertSame(enabledTransactions, returned);
        verify(mobileTransactionRepository).findByCommercialIdAndState("commercial.a", State.ENABLED);
    }
}
