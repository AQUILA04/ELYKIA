package com.optimize.elykia.core.dto;

import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.Objects;

public record TontineMemberRespDto(Long id, TontineSession tontineSession, ClientRespDto client,
                                   Double totalContribution,
                                   TontineMemberDeliveryStatus deliveryStatus,
                                   LocalDateTime registrationDate,
                                   TontineDeliveryRespDto delivery,
                                   TontineMemberFrequency frequency,
                                   Double amount,
                                   String notes,
                                   Double societyShare,
                                   Double availableContribution,
                                   Integer validatedMonths,
                                   Integer currentMonthDays
                                   ) {

    public static TontineMemberRespDto fromId(Long id) {
        if (Objects.isNull(id)) {
            return null;
        }

        return new TontineMemberRespDto(id, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    public static TontineMemberRespDto fromTontineMember(TontineMember member) {
        if (Objects.isNull(member)) {
            return null;
        }
        return new TontineMemberRespDto(member.getId(), member.getTontineSession(), ClientRespDto.fromClient(member.getClient()),
                member.getTotalContribution(), member.getDeliveryStatus(), member.getRegistrationDate(), TontineDeliveryRespDto.fromTontineDelivery(member.getDelivery()), member.getFrequency(),
                member.getAmount(), member.getNotes(), member.getSocietyShare(), member.getAvailableContribution(),
                member.getValidatedMonths(), member.getCurrentMonthDays());
    }

    public static Page<TontineMemberRespDto> fromTontineMembers(Page<TontineMember> members) {
        if (Objects.isNull(members)) {
            return null;
        }
        return members.map(TontineMemberRespDto::fromTontineMember);
    }
}
