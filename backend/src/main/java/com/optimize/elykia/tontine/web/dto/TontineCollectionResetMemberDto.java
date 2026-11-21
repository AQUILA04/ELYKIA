package com.optimize.elykia.tontine.web.dto;

import com.optimize.elykia.tontine.domain.TontineCollectionResetMember;

public record TontineCollectionResetMemberDto(
        Long id,
        Long tontineMemberId,
        String clientName,
        String clientCode,
        Double totalContributionBefore,
        Double societyShareBefore,
        Double availableContributionBefore,
        Integer validatedMonthsBefore,
        Integer currentMonthDaysBefore,
        Double totalContributionAfter,
        Double societyShareAfter,
        Double availableContributionAfter,
        Integer validatedMonthsAfter,
        Integer currentMonthDaysAfter,
        Double removedAmount,
        Double keptAmount
) {
    public static TontineCollectionResetMemberDto from(TontineCollectionResetMember member) {
        return new TontineCollectionResetMemberDto(
                member.getId(),
                member.getTontineMemberId(),
                member.getClientName(),
                member.getClientCode(),
                member.getTotalContributionBefore(),
                member.getSocietyShareBefore(),
                member.getAvailableContributionBefore(),
                member.getValidatedMonthsBefore(),
                member.getCurrentMonthDaysBefore(),
                member.getTotalContributionAfter(),
                member.getSocietyShareAfter(),
                member.getAvailableContributionAfter(),
                member.getValidatedMonthsAfter(),
                member.getCurrentMonthDaysAfter(),
                member.getRemovedAmount(),
                member.getKeptAmount()
        );
    }
}
