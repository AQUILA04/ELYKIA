package com.optimize.elykia.notification.api;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationHubOtpClientTest {

    @Test
    void resolveEnvironment_defaultsToTestOutsideProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("local");
        assertEquals("test", NotificationHubOtpClient.resolveEnvironment(env, null));
        assertEquals("test", NotificationHubOtpClient.resolveEnvironment(env, ""));
    }

    @Test
    void resolveEnvironment_prodProfile() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        assertEquals("prod", NotificationHubOtpClient.resolveEnvironment(env, null));
    }

    @Test
    void resolveEnvironment_explicitOverride() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        assertEquals("test", NotificationHubOtpClient.resolveEnvironment(env, "test"));
    }

    @Test
    void propertyDefaultsMatchStarter() {
        NotificationHubProperties properties = new NotificationHubProperties();
        assertTrue(properties.isEnabled());
        assertTrue(properties.getOauth2().isEnabled());
        assertEquals("elykia", properties.getTenantId());
        assertEquals("elykia-customer-space", properties.getAppId());
    }
}
