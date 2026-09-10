package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.config.NotificationHubProperties;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpClient;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendResponse;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpVerifyRequest;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpVerifyResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerOtpServiceTest {

    @Mock
    private ObjectProvider<NotificationHubOtpClient> otpClientProvider;
    @Mock
    private NotificationHubOtpClient otpClient;

    private NotificationHubProperties properties;
    private CustomerOtpService service;

    @BeforeEach
    void setUp() {
        properties = new NotificationHubProperties();
        properties.setEnabled(true);
        properties.setProofTtlMinutes(10);
        properties.setProofSecret("test-proof-secret");
        service = new CustomerOtpService(otpClientProvider, properties);
        ReflectionTestUtils.setField(service, "jwtSecret", "jwt-secret");
        when(otpClientProvider.getIfAvailable()).thenReturn(otpClient);
    }

    @Test
    void sendOtp_callsHubWithE164() {
        when(otpClient.sendOtp(any(), anyString())).thenReturn(
                new OtpSendResponse(UUID.randomUUID(), Instant.now().plusSeconds(300), null, "SMS", "internal", null));

        service.sendOtp("90123456");

        ArgumentCaptor<com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendRequest> captor =
                ArgumentCaptor.forClass(
                        com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendRequest.class);
        verify(otpClient).sendOtp(captor.capture(), anyString());
        assertEquals("+22890123456", captor.getValue().to());
        assertEquals("SMS", captor.getValue().channel());
    }

    @Test
    void verifyOtp_issuesProofTokenOnSuccess() {
        when(otpClient.verifyOtp(any(OtpVerifyRequest.class)))
                .thenReturn(new OtpVerifyResponse(true, "VALID"));

        String proof = service.verifyOtp("90123456", "123456");
        assertTrue(proof.startsWith("90123456."));
        assertDoesNotThrow(() -> service.assertProofToken("90123456", proof));
    }

    @Test
    void verifyOtp_rejectsInvalidCode() {
        when(otpClient.verifyOtp(any(OtpVerifyRequest.class)))
                .thenReturn(new OtpVerifyResponse(false, "INVALID"));

        CustomValidationException ex = assertThrows(
                CustomValidationException.class, () -> service.verifyOtp("90123456", "000000"));
        assertTrue(ex.getMessage().contains("incorrect"));
    }

    @Test
    void assertProofToken_rejectsTamperedToken() {
        when(otpClient.verifyOtp(any(OtpVerifyRequest.class)))
                .thenReturn(new OtpVerifyResponse(true, "VALID"));
        String proof = service.verifyOtp("90123456", "123456");
        String tampered = proof.substring(0, proof.length() - 2) + "ff";

        assertThrows(CustomValidationException.class, () -> service.assertProofToken("90123456", tampered));
    }

    @Test
    void sendOtp_failsWhenHubDisabled() {
        properties.setEnabled(false);
        assertThrows(CustomValidationException.class, () -> service.sendOtp("90123456"));
    }
}
