package com.optimize.elykia.core.notificationhub;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.config.NotificationHubProperties;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Obtient et met en cache un access token OAuth2 (client credentials Keycloak).
 */
public class NotificationHubTokenProvider {

    private final NotificationHubProperties.OAuth2 oauth2;
    private final RestClient tokenClient;
    private final ObjectMapper objectMapper;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;

    private final Object lock = new Object();
    private volatile CachedToken cached;

    public NotificationHubTokenProvider(NotificationHubProperties properties, ObjectMapper objectMapper) {
        this.oauth2 = properties.getOauth2();
        this.objectMapper = objectMapper;
        this.connectTimeoutMs = properties.getConnectTimeoutMs();
        this.readTimeoutMs = properties.getReadTimeoutMs();

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.tokenClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public String getAccessToken() {
        CachedToken current = cached;
        if (current != null && !current.isExpired(oauth2.getRefreshSkewSeconds())) {
            return current.accessToken();
        }
        synchronized (lock) {
            current = cached;
            if (current != null && !current.isExpired(oauth2.getRefreshSkewSeconds())) {
                return current.accessToken();
            }
            cached = fetchToken();
            return cached.accessToken();
        }
    }

    private CachedToken fetchToken() {
        if (!StringUtils.hasText(oauth2.getTokenUri())
                || !StringUtils.hasText(oauth2.getClientId())
                || !StringUtils.hasText(oauth2.getClientSecret())) {
            throw new NotificationHubClientException(
                    "OAuth2 Notification Hub incomplet (token-uri / client-id / client-secret)");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", oauth2.getClientId());
        form.add("client_secret", oauth2.getClientSecret());

        try {
            String body = tokenClient
                    .post()
                    .uri(Objects.requireNonNull(oauth2.getTokenUri()))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .onStatus(
                            status -> status.isError(),
                            (request, response) -> {
                                String err = new String(response.getBody().readAllBytes());
                                throw new NotificationHubClientException(
                                        "Échec token Notification Hub HTTP "
                                                + response.getStatusCode().value(),
                                        response.getStatusCode().value(),
                                        err);
                            })
                    .body(String.class);

            JsonNode json = objectMapper.readTree(body);
            String accessToken = json.path("access_token").asText(null);
            if (!StringUtils.hasText(accessToken)) {
                throw new NotificationHubClientException(
                        "Réponse token sans access_token", -1, body);
            }
            long expiresIn = json.path("expires_in").asLong(300);
            return new CachedToken(accessToken, Instant.now().plusSeconds(expiresIn));
        } catch (NotificationHubClientException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new NotificationHubClientException("Échec obtention token Notification Hub", ex);
        }
    }

    private record CachedToken(String accessToken, Instant expiresAt) {
        boolean isExpired(int skewSeconds) {
            return Instant.now().isAfter(expiresAt.minusSeconds(Math.max(0, skewSeconds)));
        }
    }
}
