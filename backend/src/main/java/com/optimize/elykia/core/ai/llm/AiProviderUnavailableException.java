package com.optimize.elykia.core.ai.llm;

/**
 * Le fournisseur LLM est saturé ou indisponible (ex. Vertex AI RESOURCE_EXHAUSTED / 429)
 * après épuisement des réessais. Traduite en HTTP 503 par {@code AiExceptionAdvice}.
 */
public class AiProviderUnavailableException extends RuntimeException {

    public AiProviderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
