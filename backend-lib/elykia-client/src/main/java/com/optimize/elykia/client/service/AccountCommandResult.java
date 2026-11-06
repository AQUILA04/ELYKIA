package com.optimize.elykia.client.service;

import com.optimize.elykia.client.dto.AccountRespDto;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;

/**
 * Résultat d'une création ou d'une synchronisation de compte.
 * {@code alreadyExists} indique que le client avait déjà un compte : {@code account}
 * est alors ce compte, et {@code message} l'explique.
 */
public record AccountCommandResult(AccountRespDto account, String message, boolean alreadyExists) {

    public static AccountCommandResult created(Account account) {
        return new AccountCommandResult(AccountRespDto.fromAccount(account), "Compte enregistré.", false);
    }

    public static AccountCommandResult alreadyExists(Account account, Client client) {
        return new AccountCommandResult(
                AccountRespDto.fromAccount(account),
                AccountAlreadyExistsMessage.of(client, account),
                true);
    }
}
