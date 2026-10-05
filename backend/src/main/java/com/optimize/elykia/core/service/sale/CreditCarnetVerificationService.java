package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.BulkCarnetVerificationResultDto;
import com.optimize.elykia.core.dto.CreditRespDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.service.carnet.CarnetVerificationSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditCarnetVerificationService {

    private final CreditRepository creditRepository;

    @Transactional
    public CreditRespDto setVerified(Long creditId, boolean verified) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.not.found"));
        assertWritable(credit);
        CarnetVerificationSupport.apply(
                credit, verified, CarnetVerificationSupport.requireCurrentUsername(), LocalDateTime.now());
        return CreditRespDto.fromCredit(creditRepository.save(credit));
    }

    @Transactional
    public BulkCarnetVerificationResultDto bulkSet(List<Long> creditIds, boolean verified) {
        CarnetVerificationSupport.requireBulkIds(
                creditIds,
                "Au moins un crédit doit être sélectionné.",
                "Maximum " + CarnetVerificationSupport.MAX_BULK + " crédits par opération.");
        CarnetVerificationSupport.requireBulkMarkOnly(verified);
        List<Credit> credits = creditRepository.findAllById(creditIds);
        CarnetVerificationSupport.assertAllFound(credits, creditIds, "credit.not.found");
        return CarnetVerificationSupport.bulkApply(
                credits,
                creditIds,
                verified,
                this::assertWritable,
                creditRepository::saveAll);
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
}
