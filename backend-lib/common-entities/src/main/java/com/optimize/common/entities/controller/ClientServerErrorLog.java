package com.optimize.common.entities.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Une ligne sur la sortie standard, lue par Loki.
 * Le logger {@code EventLog} n'y écrit pas : il ne sert pas pour l'alerte.
 */
public final class ClientServerErrorLog {

    private static final Logger LOG = LoggerFactory.getLogger(ClientServerErrorLog.class);
    private static final int MAX = 220;

    private ClientServerErrorLog() {
    }

    public static void notify(String clientMessage) {
        LOG.error("CLIENT_500 {}", format(clientMessage));
    }

    static String format(String clientMessage) {
        String one = clientMessage == null ? "" : clientMessage.replaceAll("\\s+", " ").trim();
        if (one.isEmpty()) {
            return "erreur interne";
        }
        if (one.length() > MAX) {
            return one.substring(0, MAX);
        }
        return one;
    }
}
