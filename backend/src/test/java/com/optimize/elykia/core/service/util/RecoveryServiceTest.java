package com.optimize.elykia.core.service.util;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.Recovery;
import com.optimize.elykia.core.repository.RecoveryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecoveryServiceTest {

    @Mock private RecoveryRepository recoveryRepository;

    @Test
    void getAllRecoveriesByCommercial_filtersRepositoryQueryToEnabledRecoveriesForTheRequestedCommercial() {
        // Given
        RecoveryService service = new RecoveryService(recoveryRepository);
        List<Recovery> enabledRecoveries = List.of(new Recovery(), new Recovery());
        when(recoveryRepository.findByCommercialIdAndState("commercial.a", State.ENABLED))
                .thenReturn(enabledRecoveries);

        // When
        List<Recovery> returned = service.getAllRecoveriesByCommercial("commercial.a");

        // Then
        assertSame(enabledRecoveries, returned);
        verify(recoveryRepository).findByCommercialIdAndState("commercial.a", State.ENABLED);
    }
}
