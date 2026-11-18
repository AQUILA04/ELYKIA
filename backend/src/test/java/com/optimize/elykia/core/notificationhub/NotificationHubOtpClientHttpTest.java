package com.optimize.elykia.core.notificationhub;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.config.NotificationHubProperties;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendRequest;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendResponse;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpVerifyRequest;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpVerifyResponse;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

/**
 * Contrat HTTP réel du hub ({@code POST /v1/otp/send} et {@code /v1/otp/verify}).
 */
class NotificationHubOtpClientHttpTest {

    private HttpServer server;
    private final ObjectMapper json = new ObjectMapper();
    private final AtomicReference<Captured> captured = new AtomicReference<>();

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/otp/send", exchange -> {
            captured.set(Captured.from(exchange));
            byte[] body = """
                    {"sessionId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","expiresAt":"2026-11-18T12:00:00Z","notificationId":null,"channel":"SMS","provider":"twilio-verify","providerReference":"VEabc","reference":null,"futureField":"ignored"}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(202, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext("/v1/otp/verify", exchange -> {
            captured.set(Captured.from(exchange));
            byte[] body = "{\"valid\":false,\"reason\":\"INVALID\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendOtp_postsHubContractAndReadsExpiresAt() throws Exception {
        NotificationHubOtpClient client = client(null, "prod");

        OtpSendResponse response = client.sendOtp(
                OtpSendRequest.sms("+22890331234", null),
                "11111111-1111-1111-1111-111111111111");

        Captured call = captured.get();
        assertEquals("POST", call.method());
        assertEquals("/v1/otp/send", call.path());
        assertEquals("elykia", call.header("X-Tenant-Id"));
        assertEquals("elykia-customer-space", call.header("X-App-Id"));
        assertEquals("11111111-1111-1111-1111-111111111111", call.header("Idempotency-Key"));
        assertNull(call.header("Authorization"));
        assertTrue(call.header("Content-Type").startsWith("application/json"));

        JsonNode body = json.readTree(call.body());
        assertEquals("+22890331234", body.get("to").asText());
        assertEquals("SMS", body.get("channel").asText());
        assertEquals("prod", body.get("environment").asText());

        assertEquals("a1b2c3d4-e5f6-7890-abcd-ef1234567890", response.sessionId().toString());
        assertEquals(Instant.parse("2026-11-18T12:00:00Z"), response.expiresAt());
        assertEquals("SMS", response.channel());
        assertEquals("twilio-verify", response.provider());
        assertNull(response.reference());
    }

    @Test
    void sendOtp_sendsBearerTokenWhenOAuthEnabled() {
        NotificationHubProperties tokenProperties = new NotificationHubProperties();
        tokenProperties.getOauth2().setTokenUri("http://127.0.0.1:9/token");
        tokenProperties.getOauth2().setClientId("elykia");
        tokenProperties.getOauth2().setClientSecret("test-client-secret");
        NotificationHubTokenProvider provider =
                spy(new NotificationHubTokenProvider(tokenProperties, new ObjectMapper()));
        doReturn("hub-access-token").when(provider).getAccessToken();

        NotificationHubOtpClient client = client(provider, "test");
        client.sendOtp(OtpSendRequest.sms("+22890331234", "test"), "idem-1");

        assertEquals("Bearer hub-access-token", captured.get().header("Authorization"));
        assertTrue(captured.get().body().contains("\"environment\":\"test\""));
    }

    @Test
    void verifyOtp_postsCodeWithoutIdempotencyKey() throws Exception {
        NotificationHubOtpClient client = client(null, "prod");

        OtpVerifyResponse response = client.verifyOtp(OtpVerifyRequest.of("+22890331234", "123456"));

        Captured call = captured.get();
        assertEquals("/v1/otp/verify", call.path());
        assertNull(call.header("Idempotency-Key"));
        JsonNode body = json.readTree(call.body());
        assertEquals("+22890331234", body.get("to").asText());
        assertEquals("123456", body.get("code").asText());
        assertEquals(false, response.valid());
        assertEquals("INVALID", response.reason());
    }

    private NotificationHubOtpClient client(NotificationHubTokenProvider tokenProvider, String springProfile) {
        NotificationHubProperties properties = new NotificationHubProperties();
        properties.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.setTenantId("elykia");
        properties.setAppId("elykia-customer-space");
        properties.setEnvironment(null);
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(springProfile);
        return new NotificationHubOtpClient(properties, tokenProvider, environment, new ObjectMapper());
    }

    private record Captured(String method, String path, String body, com.sun.net.httpserver.Headers headers) {
        static Captured from(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            return new Captured(
                    exchange.getRequestMethod(),
                    exchange.getRequestURI().getPath(),
                    body,
                    exchange.getRequestHeaders());
        }

        String header(String name) {
            return headers.getFirst(name);
        }
    }
}
