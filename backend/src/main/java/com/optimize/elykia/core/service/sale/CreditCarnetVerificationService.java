package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.BulkCarnetVerificationResultDto;
import com.optimize.elykia.core.dto.CreditRespDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditCarnetVerificationService {

    static final int MAX_BULK = 500;

    private final CreditRepository creditRepository;

    @Transactional
    public CreditRespDto setVerified(Long creditId, boolean verified) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.not.found"));
        assertWritable(credit);
        apply(credit, verified, currentUsername(), LocalDateTime.now());
        return CreditRespDto.fromCredit(creditRepository.save(credit));
    }

    @Transactional
    public BulkCarnetVerificationResultDto bulkSet(List<Long> creditIds, boolean verified) {
        if (creditIds == null || creditIds.isEmpty()) {
            throw new CustomValidationException("Au moins un crédit doit être sélectionné.");
        }
        if (creditIds.size() > MAX_BULK) {
            throw new CustomValidationException("Maximum " + MAX_BULK + " crédits par opération.");
        }
        if (!verified) {
            throw new CustomValidationException(
                    "La vérification en masse ne peut que marquer les carnets, pas les décocher.");
        }

        List<Credit> credits = creditRepository.findAllById(creditIds);
        if (credits.size() != new HashSet<>(creditIds).size()) {
            throw new ResourceNotFoundException("credit.not.found");
        }

        String username = currentUsername();
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        int skipped = 0;
        for (Credit credit : credits) {
            assertWritable(credit);
            if (Boolean.TRUE.equals(credit.getCarnetVerified()) == verified) {
                skipped++;
                continue;
            }
            apply(credit, verified, username, now);
            updated++;
        }
        creditRepository.saveAll(credits);
        return new BulkCarnetVerificationResultDto(updated, skipped, creditIds.size());
    }

    void apply(Credit credit, boolean verified, String username, LocalDateTime now) {
        if (verified) {
            if (Boolean.TRUE.equals(credit.getCarnetVerified())) {
                return;
            }
            credit.setCarnetVerified(true);
            credit.setCarnetVerifiedAt(now);
            credit.setCarnetVerifiedBy(username);
            return;
        }
        credit.setCarnetVerified(false);
        credit.setCarnetVerifiedAt(null);
        credit.setCarnetVerifiedBy(null);
    }

    private void assertWritable(Credit credit) {
        if (credit.getType() != OperationType.CREDIT) {
            throw new CustomValidationException(
                    "La vérification de carnet n'est possible que sur une vente à crédit.");
        }
        if (credit.getStatus() != CreditStatus.INPROGRESS) {
            throw new CustomValidationException(
                    "La vérification de carnet n'est possible que sur un crédit en cours.");
        }
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomValidationException("Utilisateur non authentifié.");
        }
        return authentication.getName();
    }
}
