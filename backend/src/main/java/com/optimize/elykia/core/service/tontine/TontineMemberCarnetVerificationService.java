package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.BulkCarnetVerificationResultDto;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.carnet.CarnetVerificationSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TontineMemberCarnetVerificationService {

    private final TontineMemberRepository tontineMemberRepository;
    private final TontineSessionRepository tontineSessionRepository;

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
        TontineSession active = requireActiveSession();
        List<TontineMember> members = tontineMemberRepository.findAllById(memberIds);
        CarnetVerificationSupport.assertAllFound(members, memberIds, "tontine.member.not.found");
        return CarnetVerificationSupport.bulkApply(
                members,
                memberIds,
                verified,
                member -> assertBelongsToSession(member, active),
                tontineMemberRepository::saveAll);
    }

    private void assertWritable(TontineMember member) {
        TontineSession active = requireActiveSession();
        assertBelongsToSession(member, active);
    }

    private void assertBelongsToSession(TontineMember member, TontineSession active) {
        if (member.getTontineSession() == null || !active.getId().equals(member.getTontineSession().getId())) {
            throw new CustomValidationException(
                    "La vérification de carnet n'est possible que sur la session tontine en cours.");
        }
    }

    private TontineSession requireActiveSession() {
        int currentYear = LocalDate.now().getYear();
        TontineSession session = tontineSessionRepository.findByYear(currentYear)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucune session de tontine active trouvée pour l'année en cours."));
        if (session.getStatus() != TontineSessionStatus.ACTIVE) {
            throw new CustomValidationException(
                    "La vérification de carnet n'est possible que sur une session tontine active.");
        }
        return session;
    }
}
