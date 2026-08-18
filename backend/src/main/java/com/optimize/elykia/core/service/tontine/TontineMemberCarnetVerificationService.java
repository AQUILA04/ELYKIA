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
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TontineMemberCarnetVerificationService {

    static final int MAX_BULK = 500;

    private final TontineMemberRepository tontineMemberRepository;
    private final TontineSessionRepository tontineSessionRepository;

    @Transactional
    public TontineMemberRespDto setVerified(Long memberId, boolean verified) {
        TontineMember member = tontineMemberRepository.findByIdWithClient(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.not.found"));
        assertWritable(member);
        apply(member, verified, currentUsername(), LocalDateTime.now());
        return TontineMemberRespDto.fromTontineMember(tontineMemberRepository.save(member));
    }

    @Transactional
    public BulkCarnetVerificationResultDto bulkSet(List<Long> memberIds, boolean verified) {
        if (memberIds == null || memberIds.isEmpty()) {
            throw new CustomValidationException("Au moins un membre doit être sélectionné.");
        }
        if (memberIds.size() > MAX_BULK) {
            throw new CustomValidationException("Maximum " + MAX_BULK + " membres par opération.");
        }

        if (!verified) {
            throw new CustomValidationException(
                    "La vérification en masse ne peut que marquer les carnets, pas les décocher.");
        }
        TontineSession active = requireActiveSession();
        List<TontineMember> members = tontineMemberRepository.findAllById(memberIds);
        if (members.size() != new HashSet<>(memberIds).size()) {
            throw new ResourceNotFoundException("tontine.member.not.found");
        }

        String username = currentUsername();
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        int skipped = 0;
        for (TontineMember member : members) {
            assertBelongsToSession(member, active);
            if (Boolean.TRUE.equals(member.getCarnetVerified()) == verified) {
                skipped++;
                continue;
            }
            apply(member, verified, username, now);
            updated++;
        }
        tontineMemberRepository.saveAll(members);
        return new BulkCarnetVerificationResultDto(updated, skipped, memberIds.size());
    }

    void apply(TontineMember member, boolean verified, String username, LocalDateTime now) {
        if (verified) {
            if (Boolean.TRUE.equals(member.getCarnetVerified())) {
                return;
            }
            member.setCarnetVerified(true);
            member.setCarnetVerifiedAt(now);
            member.setCarnetVerifiedBy(username);
            return;
        }
        member.setCarnetVerified(false);
        member.setCarnetVerifiedAt(null);
        member.setCarnetVerifiedBy(null);
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

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomValidationException("Utilisateur non authentifié.");
        }
        return authentication.getName();
    }
}
