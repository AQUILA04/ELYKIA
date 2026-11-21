package com.optimize.elykia.client.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.enumeration.AccountStatus;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

public record AccountRespDto (Long id,
                              String accountNumber,
                              Long clientId,
                              String clientFirstname,
                              String clientLastname,
                              double accountBalance,
                              AccountStatus status,
                              @JsonFormat(pattern = "yyyy-MM-dd") LocalDateTime createdAt
) {
    public AccountRespDto(Long id, String accountNumber, Long clientId, double accountBalance, AccountStatus status, LocalDateTime createdAt) {
        this(id, accountNumber, clientId, null, null, accountBalance, status, createdAt);
    }

    public ClientRespDto getClient() {
        if (Objects.isNull(this.clientId)) {
            return null;
        }

        if (Objects.nonNull(this.clientFirstname) && Objects.nonNull(this.clientLastname)) {
            return ClientRespDto.withFirstnameAndLastname(this.clientId, this.clientFirstname, this.clientLastname);
        }
        return ClientRespDto.fromId(this.clientId);
    }

    public static AccountRespDto fromAccount(Account account) {
        if (Objects.isNull(account)) {
            return null;
        }

        return new AccountRespDto(account.getId(), account.getAccountNumber(),
                account.getClient() != null ? account.getClient().getId() : null,
                account.getAccountBalance(), account.getStatus(), account.getCreatedDate());
    }

    public static List<AccountRespDto> fromAccountList(List<Account> accounts) {
        if (accounts == null) {
            return List.of();
        }
        return accounts.stream().map(AccountRespDto::fromAccount).toList();
    }

    public static Page<AccountRespDto> fromAccountPage(Page<Account> accounts) {
        if (accounts == null) {
            return Page.empty();
        }
        return accounts.map(AccountRespDto::fromAccount);
    }
}
