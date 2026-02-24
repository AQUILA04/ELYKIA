package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditArticles;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.SolvencyStatus;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;

public record CreditRespDto(Long id,
                            Long clientId,
                            LocalDate beginDate,
                            LocalDate expectedEndDate,
                            LocalDate effectiveEndDate,
                            SolvencyStatus solvencyNote,
                            Integer lateDaysCount,
                            Double totalAmount,
                            Double totalPurchase,
                            Double totalAmountPaid,
                            Double totalAmountRemaining, 
                            Double dailyStake,
                            CreditStatus status,
                            Integer remainingDaysCount,
                            String collector,
                            OperationType type,
                            Boolean dailyPaid,
                            ClientType clientType,
                            Long parentId,
                            Boolean updatable,
                            String reference,
                            LocalDate accountingDate,
                            LocalDate releaseDate,
                            Boolean releasePrinted,
                            String oldReference,
                            Set<CreditArticles> articles,
                            ClientRespDto client
) {

    public ClientRespDto getClient() {
        if (Objects.isNull(this.clientId) && Objects.isNull(this.client)) {
            return null;
        }
        return Objects.nonNull(this.client) ? this.client : ClientRespDto.fromId(this.clientId);
    }

    public CreditRespDto getParent() {
        if (Objects.isNull(parentId)) {
            return null;
        }
        return CreditRespDto.fromId(this.parentId);
    }

    @JsonIgnore
    public static CreditRespDto fromId(Long id) {
        return new CreditRespDto(id, null, null, null,null, null,
                null, null, null, null, null,
                null, null, null,null, null, null, null, null,
        null, null, null, null, null, null, null, null);
    }

    public static CreditRespDto fromCredit(Credit credit) {
        Long parentId = Objects.nonNull(credit.getParent()) ? credit.getParent().getId() : null;
        ClientRespDto client  = ClientRespDto.fromClient(credit.getClient());
        return new CreditRespDto(credit.getId(), credit.getClientId(), credit.getBeginDate(), credit.getExpectedEndDate(),credit.getEffectiveEndDate(), credit.getSolvencyNote(),
                credit.getLateDaysCount(), credit.getTotalAmount(), credit.getTotalAmount(), credit.getTotalAmountPaid(), credit.getTotalAmountRemaining(),
                credit.getDailyStake(), credit.getStatus(), credit.getRemainingDaysCount(),credit.getCollector(), credit.getType(), credit.getDailyPaid(), credit.getClientType(), parentId,
                credit.getUpdatable(), credit.getReference(), credit.getAccountingDate(), credit.getReleaseDate(), credit.getReleasePrinted(), credit.getOldReference(), null, client);
    }

    public static Page<CreditRespDto> fromCreditPage(Page<Credit> creditPage) {
        if (Objects.isNull(creditPage)) {
            return null;
        }

        return creditPage.map(CreditRespDto::fromCredit);
    }

    public static List<CreditRespDto> fromCreditList(List<Credit> creditList) {
        if (Objects.isNull(creditList)) {
            return null;
        }
        return creditList.stream().map(CreditRespDto::fromCredit).toList();
    }

    @JsonIgnore
    public CreditRespDto addArticles(Set<CreditArticles> creditArticles) {

        return new CreditRespDto(this.id, this.clientId, this.beginDate, this.expectedEndDate,this.effectiveEndDate, this.solvencyNote,
                this.lateDaysCount, this.totalAmount, this.totalPurchase, this.totalAmountPaid, this.totalAmountRemaining,
                this.dailyStake, this.status, this.remainingDaysCount,this.collector, this.type, this.dailyPaid, this.clientType, this.parentId,
                this.updatable, this.reference, this.accountingDate, this.releaseDate, this.releasePrinted, this.oldReference,creditArticles, this.client);
    }
}
