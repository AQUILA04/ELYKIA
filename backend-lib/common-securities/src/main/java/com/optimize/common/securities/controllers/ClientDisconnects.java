package com.optimize.common.securities.controllers;

import org.apache.catalina.connector.ClientAbortException;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;
import java.util.IdentityHashMap;
import java.util.Locale;
import java.util.Set;

/**
 * Un client qui coupe la connexion (téléchargement interrompu, navigation) ne doit pas
 * devenir une erreur 500. Spring 6 enveloppe souvent {@link ClientAbortException} dans
 * {@link AsyncRequestNotUsableException}.
 */
public final class ClientDisconnects {

    private ClientDisconnects() {
    }

    public static boolean isClientDisconnect(Throwable error) {
        Set<Throwable> seen = java.util.Collections.newSetFromMap(new IdentityHashMap<>());
        Throwable current = error;
        while (current != null && seen.add(current)) {
            if (current instanceof AsyncRequestNotUsableException || current instanceof ClientAbortException) {
                return true;
            }
            if (current instanceof IOException && isBrokenPipeOrReset(current.getMessage())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static boolean isBrokenPipeOrReset(String message) {
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase(Locale.ROOT);
        return normalized.contains("broken pipe") || normalized.contains("connection reset");
    }
}
