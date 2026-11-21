package com.optimize.elykia.notification.api;


import com.optimize.elykia.notification.infrastructure.hub.NotificationHubTokenProvider;
import com.optimize.elykia.notification.api.NotificationHubOtpModels.OtpSendRequest;
import com.optimize.elykia.notification.api.NotificationHubOtpModels.OtpSendResponse;
import com.optimize.elykia.notification.api.NotificationHubOtpModels.OtpVerifyRequest;
import com.optimize.elykia.notification.api.NotificationHubOtpModels.OtpVerifyResponse;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.function.Consumer;

/**
 * Client HTTP OTP Notification Hub (contrat {@code OTP_CLIENT_INTEGRATION.md}).
 */
public class NotificationHubOtpClient {

    static final String TENANT_HEADER = "X-Tenant-Id";
    static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    static final String APP_ID_HEADER = "X-App-Id";

    private final RestClient restClient;
    private final NotificationHubTokenProvider tokenProvider;
    private final String tenantId;
    private final String appId;
    private final String defaultEnvironment;

    public NotificationHubOtpClient(
            NotificationHubProperties properties,
            NotificationHubTokenProvider tokenProvider,
            Environment environment,
            ObjectMapper objectMapper) {
        this.tokenProvider = tokenProvider;
        this.tenantId = properties.getTenantId();
        this.appId = properties.getAppId();
        this.defaultEnvironment = resolveEnvironment(environment, properties.getEnvironment());

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(properties.getConnectTimeoutMs()))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofMillis(properties.getReadTimeoutMs()));

        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        JsonMapper mapper = (objectMapper instanceof JsonMapper jm ? jm.rebuild() : JsonMapper.builder())
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        JacksonJsonHttpMessageConverter jackson = new JacksonJsonHttpMessageConverter(mapper);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .configureMessageConverters(converters -> converters.withJsonConverter(jackson))
                .build();
    }

    public OtpSendResponse sendOtp(OtpSendRequest request, String idempotencyKey) {
        OtpSendRequest body = withEnvironment(request);
        return restClient
                .post()
                .uri("/v1/otp/send")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(authHeaders(idempotencyKey))
                .body(body)
                .retrieve()
                .onStatus(status -> status.isError(), this::mapError)
                .body(OtpSendResponse.class);
    }

    public OtpVerifyResponse verifyOtp(OtpVerifyRequest request) {
        return restClient
                .post()
                .uri("/v1/otp/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(authHeaders(null))
                .body(request)
                .retrieve()
                .onStatus(status -> status.isError(), this::mapError)
                .body(OtpVerifyResponse.class);
    }

    private OtpSendRequest withEnvironment(OtpSendRequest request) {
        if (request == null || StringUtils.hasText(request.environment())) {
            return request;
        }
        return new OtpSendRequest(
                request.to(), request.channel(), request.metadata(), defaultEnvironment);
    }

    private Consumer<HttpHeaders> authHeaders(String idempotencyKey) {
        return headers -> {
            if (tokenProvider != null) {
                headers.setBearerAuth(tokenProvider.getAccessToken());
            }
            if (StringUtils.hasText(tenantId)) {
                headers.set(TENANT_HEADER, tenantId);
            }
            if (StringUtils.hasText(appId)) {
                headers.set(APP_ID_HEADER, appId);
            }
            if (StringUtils.hasText(idempotencyKey)) {
                headers.set(IDEMPOTENCY_HEADER, idempotencyKey);
            }
        };
    }

    private void mapError(
            org.springframework.http.HttpRequest request,
            org.springframework.http.client.ClientHttpResponse response)
            throws java.io.IOException {
        String body = new String(response.getBody().readAllBytes());
        throw new NotificationHubClientException(
                "Notification Hub : "
                        + request.getMethod()
                        + " "
                        + request.getURI()
                        + " → HTTP "
                        + response.getStatusCode().value(),
                response.getStatusCode().value(),
                body);
    }

    static String resolveEnvironment(Environment environment, String configured) {
        if (StringUtils.hasText(configured)) {
            return configured.trim().toLowerCase(Locale.ROOT);
        }
        boolean prod = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
        return prod ? "prod" : "test";
    }
}
