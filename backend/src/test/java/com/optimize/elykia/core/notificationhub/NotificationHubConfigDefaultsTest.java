package com.optimize.elykia.core.notificationhub;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le message « L'envoi SMS OTP n'est pas activé » vient d'un défaut {@code enabled=false}.
 * Ces fichiers ne doivent pas revenir à ce défaut.
 */
class NotificationHubConfigDefaultsTest {

    @Test
    void deployedProfilesAndComposeEnableTheHub() throws Exception {
        String application = read("src/main/resources/application.yml");
        String prod = read("src/main/resources/application-prod.yml");
        String uat = read("src/main/resources/application-uat.yml");
        String formation = read("src/main/resources/application-formation.yml");
        String composeProd = read("../deploy/docker-compose.prod.yml");
        String composeTest = read("../deploy/docker-compose.test.yml");
        String envProd = read("../deploy/.env.contabo.prod.example");

        assertTrue(application.contains("enabled: ${NOTIFICATION_HUB_ENABLED:true}"));
        assertTrue(prod.contains("enabled: ${NOTIFICATION_HUB_ENABLED:true}"));
        assertTrue(prod.contains("enabled: ${NOTIFICATION_HUB_OAUTH2_ENABLED:true}"));
        assertTrue(uat.contains("enabled: ${NOTIFICATION_HUB_ENABLED:true}"));
        assertTrue(uat.contains("environment: ${NOTIFICATION_HUB_ENVIRONMENT:test}"));
        assertTrue(formation.contains("enabled: ${NOTIFICATION_HUB_ENABLED:true}"));
        assertTrue(formation.contains("environment: ${NOTIFICATION_HUB_ENVIRONMENT:test}"));
        assertTrue(composeProd.contains("NOTIFICATION_HUB_ENABLED: ${NOTIFICATION_HUB_ENABLED:-true}"));
        assertTrue(composeTest.contains("NOTIFICATION_HUB_ENABLED: ${NOTIFICATION_HUB_ENABLED:-true}"));
        assertTrue(composeTest.contains("NOTIFICATION_HUB_ENVIRONMENT: ${NOTIFICATION_HUB_ENVIRONMENT:-test}"));
        assertTrue(envProd.lines().anyMatch(line -> line.equals("NOTIFICATION_HUB_ENABLED=true")));
        assertFalse(envProd.lines().anyMatch(line -> line.equals("NOTIFICATION_HUB_ENABLED=false")));
    }

    private static String read(String relativeToBackend) throws Exception {
        return Files.readString(Path.of(relativeToBackend));
    }
}
