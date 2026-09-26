package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class CustomerOnboardingServiceTest {

    @InjectMocks
    private CustomerOnboardingService service;

    @Test
    void assertPortalFeatureAllowed_blocksPending() {
        Client client = new Client();
        client.setActivationStatus(ClientActivationStatus.PENDING);
        assertThrows(CustomValidationException.class, () -> service.assertPortalFeatureAllowed(client));
    }

    @Test
    void assertPortalFeatureAllowed_blocksRejected() {
        Client client = new Client();
        client.setActivationStatus(ClientActivationStatus.REJECTED);
        assertThrows(CustomValidationException.class, () -> service.assertPortalFeatureAllowed(client));
    }

    @Test
    void assertPortalFeatureAllowed_allowsActive() {
        Client client = new Client();
        client.setActivationStatus(ClientActivationStatus.ACTIVE);
        assertDoesNotThrow(() -> service.assertPortalFeatureAllowed(client));
    }
}
