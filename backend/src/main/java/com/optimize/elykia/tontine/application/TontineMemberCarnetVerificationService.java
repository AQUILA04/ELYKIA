package com.optimize.elykia.tontine.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.shared.carnet.BulkCarnetVerificationResultDto;
import com.optimize.elykia.shared.carnet.CarnetVerificationSupport;
import com.optimize.elykia.tontine.domain.TontineMember;
import com.optimize.elykia.tontine.domain.TontineSession;
import com.optimize.elykia.tontine.domain.TontineSessionStatus;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineMemberRepository;
import com.optimize.elykia.tontine.web.dto.TontineMemberRespDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TontineMemberCarnetVerificationService {

    private final TontineMemberRepository tontineMemberRepository;

    @Transactional
    public TontineMemberRespDto setVerified(Long memberId, boolean verified) {
        TontineMember member = tontineMemberRepository.findByIdWithClient(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.not.found"));
        assertWritable(member);
        CarnetVerificationSupport.apply(
                member, verified, CarnetVerificationSupport.requireCurrentUsername(), LocalDateTime.now());
        return TontineMemberRespDto.fromTontineMember(tontineMemberRepository.save(member));
    }

    @Transactional
    public BulkCarnetVerificationResultDto bulkSet(List<Long> memberIds, boolean verified) {
        CarnetVerificationSupport.requireBulkIds(
                memberIds,
                "Au moins un membre doit être sélectionné.",
                "Maximum " + CarnetVerificationSupport.MAX_BULK + " membres par opération.");
        CarnetVerificationSupport.requireBulkMarkOnly(verified);
        List<TontineMember> members = tontineMemberRepository.findAllById(memberIds);
        CarnetVerificationSupport.assertAllFound(members, memberIds, "tontine.member.not.found");
        return CarnetVerificationSupport.bulkApply(
                members,
                memberIds,
                verified,
                this::assertWritable,
                tontineMemberRepository::saveAll);
    }

    private void assertWritable(TontineMember member) {
        TontineSession session = member.getTontineSession();
        if (session == null
                || (session.getStatus() != TontineSessionStatus.ACTIVE
                && session.getStatus() != TontineSessionStatus.CLOSED)) {
            throw new CustomValidationException(
                    "La vérification de carnet n'est possible que sur une session tontine active ou en livraison.");
        }
    }
}
