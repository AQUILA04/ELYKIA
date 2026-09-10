package com.optimize.elykia.core.notificationhub;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
