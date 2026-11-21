package com.optimize.elykia.core.service.debt;

import com.optimize.elykia.core.repository.DebtDocumentRepository;
import com.optimize.elykia.finance.api.FieldControlDebtPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Adaptateur SPI liant le module {@code finance} à l'imputation des manquants contrôle terrain.
 */
@Component
@RequiredArgsConstructor
public class FieldControlDebtPortAdapter implements FieldControlDebtPort {

    private final DebtService debtService;
    private final DebtDocumentRepository debtDocumentRepository;

    @Override
    public void imputeFieldControlFromDeposit(
            String commercialUsername,
            LocalDate day,
            double creditAmount,
            double tontineAmount,
            String depositReference) {
        debtService.imputeFieldControlFromDeposit(
                commercialUsername, day, creditAmount, tontineAmount, depositReference);
    }

    @Override
    public void reverseFieldControlImputation(String depositReference) {
        debtService.reverseFieldControlImputation(depositReference);
    }

    @Override
    public List<Object[]> findActiveCashDaysBefore(Collection<String> usernames, LocalDate before) {
        return debtDocumentRepository.findActiveCashDaysBefore(usernames, before);
    }

    @Override
    public List<LocalDate> findActiveCashDaysUpTo(String commercialUsername, LocalDate upTo) {
        return debtDocumentRepository.findActiveCashDaysUpTo(commercialUsername, upTo);
    }
}
