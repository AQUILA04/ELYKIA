package com.optimize.elykia.core.ai.llm;

/**
 * Le fournisseur LLM refuse les appels car le compte de facturation est bloqué
 * (ex. Vertex AI PERMISSION_DENIED « Lightning dunning decision is deny »).
 * L'orchestrateur la transforme en réponse assistant pour conserver la question.
 */
public class AiBillingUnavailableException extends RuntimeException {

    public AiBillingUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
