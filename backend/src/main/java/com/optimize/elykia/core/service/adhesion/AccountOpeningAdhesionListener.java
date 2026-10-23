package com.optimize.elykia.core.service.adhesion;

import com.optimize.elykia.client.event.AccountCreatedEvent;
import com.optimize.elykia.client.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AccountOpeningAdhesionListener {

    private final AdhesionService adhesionService;
    private final AccountRepository accountRepository;

    @TransactionalEventListener
    @Transactional
    public void onAccountCreated(AccountCreatedEvent event) {
        if (event.getAccountNumber() == null) {
            return;
        }
        accountRepository.findFirstByAccountNumber(event.getAccountNumber()).ifPresent(account -> {
            if (account.getClient() == null || account.getClient().getId() == null) {
                return;
            }
            double balance = event.getInitialBalance() == null ? 0d : event.getInitialBalance();
            adhesionService.ensurePersonalFromAccountOpening(account.getClient().getId(), balance);
        });
    }
}
