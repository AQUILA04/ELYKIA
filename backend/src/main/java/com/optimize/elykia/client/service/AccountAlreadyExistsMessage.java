package com.optimize.elykia.client.service;

import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import org.springframework.util.StringUtils;

/**
 * Message affiché lorsqu'un client possède déjà un compte.
 * Le libellé nomme le client et, lorsqu'il est connu, le numéro du compte existant.
 */
public final class AccountAlreadyExistsMessage {

    private AccountAlreadyExistsMessage() {
    }

    public static String of(Client client, Account account) {
        String owner = ownerLabel(client);
        String number = account == null ? null : account.getAccountNumber();
        if (StringUtils.hasText(number)) {
            return owner + " a déjà un compte (n° " + number.trim() + ").";
        }
        return owner + " a déjà un compte.";
    }

    private static String ownerLabel(Client client) {
        if (client == null) {
            return "Ce client";
        }
        String firstname = client.getFirstname() == null ? "" : client.getFirstname().trim();
        String lastname = client.getLastname() == null ? "" : client.getLastname().trim();
        String name = (firstname + " " + lastname).trim();
        if (StringUtils.hasText(name)) {
            return "Le client " + name;
        }
        if (client.getId() != null) {
            return "Le client n° " + client.getId();
        }
        return "Ce client";
    }
}
