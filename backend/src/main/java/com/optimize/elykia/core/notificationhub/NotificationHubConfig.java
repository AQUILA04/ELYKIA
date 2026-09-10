package com.optimize.elykia.core.notificationhub;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.config.NotificationHubProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.Assert;

@Configuration
@ConditionalOnProperty(prefix = "optimize.notification.hub", name = "enabled", havingValue = "true")
public class NotificationHubConfig {

    @Bean
    NotificationHubOtpClient notificationHubOtpClient(
            NotificationHubProperties properties,
            Environment environment,
            ObjectMapper objectMapper) {
        Assert.hasText(properties.getBaseUrl(), "optimize.notification.hub.base-url requis");

        NotificationHubTokenProvider tokenProvider = null;
        if (properties.getOauth2().isEnabled()) {
            Assert.hasText(
                    properties.getOauth2().getTokenUri(),
                    "optimize.notification.hub.oauth2.token-uri requis");
            Assert.hasText(
                    properties.getOauth2().getClientId(),
                    "optimize.notification.hub.oauth2.client-id requis");
            Assert.hasText(
                    properties.getOauth2().getClientSecret(),
                    "optimize.notification.hub.oauth2.client-secret requis");
            tokenProvider = new NotificationHubTokenProvider(properties, objectMapper);
        } else {
            Assert.hasText(
                    properties.getTenantId(),
                    "optimize.notification.hub.tenant-id requis lorsque oauth2 est désactivé");
        }
        return new NotificationHubOtpClient(properties, tokenProvider, environment);
    }
}
