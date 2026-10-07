package com.optimize.elykia.core.ai.llm;

import com.google.api.gax.rpc.ApiException;
import com.google.api.gax.rpc.StatusCode;
import com.optimize.elykia.core.ai.config.AiProperties;
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

    private static final Set<StatusCode.Code> RETRYABLE_CODES = Set.of(
            StatusCode.Code.RESOURCE_EXHAUSTED,
            StatusCode.Code.UNAVAILABLE,
            StatusCode.Code.DEADLINE_EXCEEDED);

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
                StatusCode.Code code = retryableCode(e);
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
    public ChatOptions getDefaultOptions() {
        return delegate.getDefaultOptions();
    }

    /**
     * Remonte la chaîne de causes à la recherche d'un statut fournisseur réessayable.
     * Renvoie {@code null} si l'échec n'est pas un throttle (bug applicatif, prompt invalide…).
     */
    private static StatusCode.Code retryableCode(Throwable error) {
        Throwable cause = error;
        for (int depth = 0; cause != null && depth < MAX_CAUSE_DEPTH; depth++) {
            if (cause instanceof ApiException apiException && apiException.getStatusCode() != null) {
                StatusCode.Code code = apiException.getStatusCode().getCode();
                if (RETRYABLE_CODES.contains(code)) {
                    return code;
                }
            }
            Throwable next = cause.getCause();
            cause = next == cause ? null : next;
        }
        return null;
    }

    /**
     * PERMISSION_DENIED avec un refus de recouvrement (« dunning ») : le compte de facturation
     * du fournisseur est bloqué. Les autres PERMISSION_DENIED (API désactivée, IAM) restent des erreurs.
     */
    private static boolean isBillingDenial(Throwable error) {
        boolean permissionDenied = false;
        boolean dunning = false;
        Throwable cause = error;
        for (int depth = 0; cause != null && depth < MAX_CAUSE_DEPTH; depth++) {
            if (cause instanceof ApiException apiException && apiException.getStatusCode() != null
                    && apiException.getStatusCode().getCode() == StatusCode.Code.PERMISSION_DENIED) {
                permissionDenied = true;
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
