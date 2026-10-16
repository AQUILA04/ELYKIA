package com.optimize.elykia.core.paygate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.config.ElykiaPaygateProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;

@Component
public class OptimizePaygateClient {

    private final ElykiaPaygateProperties properties;
    private final RestClient restClient;

    public OptimizePaygateClient(ElykiaPaygateProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder().baseUrl(trimSlash(properties.getBaseUrl())).build();
    }

    public boolean isEnabled() {
        return properties.isEnabled() && StringUtils.hasText(properties.getApiKey()) && StringUtils.hasText(properties.getBaseUrl());
    }

    public PaygateQuote quote(String network, long amountDue) {
        requireEnabled();
        try {
            PaygateQuote quote = restClient.get()
                    .uri(uri -> uri.path("/v1/quotes")
                            .queryParam("country", "TG")
                            .queryParam("network", network)
                            .queryParam("amountDue", amountDue)
                            .build())
                    .header("X-Api-Key", properties.getApiKey())
                    .retrieve()
                    .body(PaygateQuote.class);
            if (quote == null) {
                throw new CustomValidationException("Le service de paiement n'a pas renvoyé de devis.");
            }
            return quote;
        } catch (RestClientException ex) {
            throw new CustomValidationException("Le service de paiement est indisponible.");
        }
    }

    public PaygatePaymentView initiate(String merchantReference, String network, String phone, long amountDue, String description) {
        requireEnabled();
        try {
            PaygatePaymentView view = restClient.post()
                    .uri("/v1/payments")
                    .header("X-Api-Key", properties.getApiKey())
                    .body(new InitiateBody(
                            merchantReference,
                            network,
                            phone,
                            amountDue,
                            description,
                            properties.getCallbackUrl()))
                    .retrieve()
                    .body(PaygatePaymentView.class);
            if (view == null || !StringUtils.hasText(view.paymentId())) {
                throw new CustomValidationException("Le service de paiement n'a pas démarré l'encaissement.");
            }
            return view;
        } catch (RestClientException ex) {
            throw new CustomValidationException("Le service de paiement est indisponible.");
        }
    }

    public PaygatePaymentView status(String paymentId) {
        requireEnabled();
        try {
            return restClient.get()
                    .uri("/v1/payments/{id}", paymentId)
                    .header("X-Api-Key", properties.getApiKey())
                    .retrieve()
                    .body(PaygatePaymentView.class);
        } catch (RestClientException ex) {
            throw new CustomValidationException("Le service de paiement est indisponible.");
        }
    }

    public String callbackSecret() {
        return properties.getCallbackSecret();
    }

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new CustomValidationException("Le paiement automatique n'est pas disponible.");
        }
    }

    private static String trimSlash(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    public record InitiateBody(
            String merchantReference,
            String network,
            String phoneNumber,
            long amountDue,
            String description,
            String callbackUrl
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PaygateQuote(
            String network,
            BigDecimal gatewayFeeRate,
            long amountDue,
            long gatewayFee,
            long amountCharged
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PaygatePaymentView(
            String paymentId,
            String merchantReference,
            String status,
            String network,
            long amountDue,
            BigDecimal gatewayFeeRate,
            long gatewayFee,
            long amountCharged,
            String providerReference,
            String operatorReference
    ) {
    }
}
