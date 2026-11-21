package com.optimize.elykia.ai.infrastructure.llm;


import com.optimize.elykia.ai.domain.AiBillingUnavailableException;
import com.optimize.elykia.ai.domain.AiProviderUnavailableException;
import com.google.genai.errors.ApiException;
import com.optimize.elykia.ai.infrastructure.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import reactor.core.publisher.Flux;

import java.util.Locale;
import java.util.Set;

/**
 * Décore le ChatModel du provider pour absorber les throttles côté fournisseur :
 * réessais avec backoff exponentiel, puis {@link AiProviderUnavailableException}
 * plutôt qu'une erreur brute remontée en 500.
 */
@Slf4j
public class ResilientChatModel implements ChatModel {

    static final String UNAVAILABLE_MESSAGE =
            "Le service d'IA est momentanément saturé. Réessayez dans quelques instants.";

    static final String BILLING_MESSAGE =
            "Un problème de facturation empêche l'assistant de répondre pour le moment. "
                    + "Votre question est enregistrée dans cette discussion : vous pouvez la copier "
                    + "et la renvoyer lorsque le service sera rétabli.";

    private static final String BILLING_DENIAL_MARKER = "dunning";
    private static final String PERMISSION_DENIED_STATUS = "PERMISSION_DENIED";

    private static final Set<String> RETRYABLE_STATUSES = Set.of(
            "RESOURCE_EXHAUSTED",
            "UNAVAILABLE",
            "DEADLINE_EXCEEDED");

    private static final Set<Integer> RETRYABLE_HTTP_CODES = Set.of(429, 503, 504);

    private static final int MAX_CAUSE_DEPTH = 10;

    private final ChatModel delegate;
    private final AiProperties.Retry retry;

    public ResilientChatModel(ChatModel delegate, AiProperties.Retry retry) {
        this.delegate = delegate;
        this.retry = retry;
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        long backoffMs = retry.getInitialBackoffMs();
        for (int attempt = 1; ; attempt++) {
            try {
                return delegate.call(prompt);
            } catch (RuntimeException e) {
                if (isBillingDenial(e)) {
                    log.warn("ai.provider.billing_denied", e);
                    throw new AiBillingUnavailableException(BILLING_MESSAGE, e);
                }
                String code = retryableCode(e);
                if (code == null) {
                    throw e;
                }
                if (attempt >= retry.getMaxAttempts()) {
                    log.warn("ai.provider.unavailable code={} attempts={}", code, attempt, e);
                    throw new AiProviderUnavailableException(UNAVAILABLE_MESSAGE, e);
                }
                log.warn("ai.provider.throttled code={} attempt={}/{} retryInMs={}",
                        code, attempt, retry.getMaxAttempts(), backoffMs);
                sleep(backoffMs);
                backoffMs = Math.min(
                        (long) (backoffMs * retry.getBackoffMultiplier()),
                        retry.getMaxBackoffMs());
            }
        }
    }

    @Override
    public Flux<ChatResponse> stream(Prompt prompt) {
        return delegate.stream(prompt);
    }

    @Override
    public ChatOptions getOptions() {
        return delegate.getOptions();
    }

    /**
     * Remonte la chaîne de causes à la recherche d'un statut fournisseur réessayable.
     * Renvoie {@code null} si l'échec n'est pas un throttle (bug applicatif, prompt invalide…).
     */
    private static String retryableCode(Throwable error) {
        Throwable cause = error;
        for (int depth = 0; cause != null && depth < MAX_CAUSE_DEPTH; depth++) {
            if (cause instanceof ApiException apiException) {
                String status = apiException.status();
                if (status != null) {
                    String normalized = status.trim().toUpperCase(Locale.ROOT);
                    if (RETRYABLE_STATUSES.contains(normalized)) {
                        return normalized;
                    }
                }
                if (RETRYABLE_HTTP_CODES.contains(apiException.code())) {
                    return "HTTP_" + apiException.code();
                }
            }
            Throwable next = cause.getCause();
            cause = next == cause ? null : next;
        }
        return null;
    }

    /**
     * PERMISSION_DENIED (ou HTTP 403) avec un refus de recouvrement (« dunning ») : le compte de facturation
     * du fournisseur est bloqué. Les autres PERMISSION_DENIED (API désactivée, IAM) restent des erreurs.
     */
    private static boolean isBillingDenial(Throwable error) {
        boolean permissionDenied = false;
        boolean dunning = false;
        Throwable cause = error;
        for (int depth = 0; cause != null && depth < MAX_CAUSE_DEPTH; depth++) {
            if (cause instanceof ApiException apiException) {
                if (apiException.code() == 403
                        || PERMISSION_DENIED_STATUS.equalsIgnoreCase(apiException.status())) {
                    permissionDenied = true;
                }
                String apiMessage = apiException.message();
                if (apiMessage != null && apiMessage.toLowerCase(Locale.ROOT).contains(BILLING_DENIAL_MARKER)) {
                    dunning = true;
                }
            }
            String message = cause.getMessage();
            if (message != null && message.toLowerCase(Locale.ROOT).contains(BILLING_DENIAL_MARKER)) {
                dunning = true;
            }
            Throwable next = cause.getCause();
            cause = next == cause ? null : next;
        }
        return permissionDenied && dunning;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiProviderUnavailableException(UNAVAILABLE_MESSAGE, e);
        }
    }
}
