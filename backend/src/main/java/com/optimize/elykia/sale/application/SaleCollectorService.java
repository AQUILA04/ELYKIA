package com.optimize.elykia.sale.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditCollectorHistory;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.infrastructure.persistence.CreditCollectorHistoryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.BulkChangeCollectorDto;
import com.optimize.elykia.sale.web.dto.CreditCollectorHistoryDto;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service applicatif dédié au transfert de portefeuille commercial (changement de collecteur
 * unitaire ou en masse et consultation de son historique).
 */
@Service
@Transactional
public class SaleCollectorService {

    private final CreditRepository creditRepository;
    private final CreditCollectorHistoryRepository creditCollectorHistoryRepository;
    private final ClientService clientService;
    private final UserService userService;
    private final Optional<BusinessMetricsPublisher> metricsPublisher;

    public SaleCollectorService(
            CreditRepository creditRepository,
            CreditCollectorHistoryRepository creditCollectorHistoryRepository,
            ClientService clientService,
            UserService userService,
            Optional<BusinessMetricsPublisher> metricsPublisher) {
        this.creditRepository = creditRepository;
        this.creditCollectorHistoryRepository = creditCollectorHistoryRepository;
        this.clientService = clientService;
        this.userService = userService;
        this.metricsPublisher = metricsPublisher;
    }

    public CreditRespDto changeCollector(Long creditId, String newCollector) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));

        if (!CreditStatus.INPROGRESS.equals(credit.getStatus())) {
            throw new CustomValidationException(
                    "Le changement de commercial n'est autorisé que pour les ventes en cours (INPROGRESS).");
        }
        if (!StringUtils.hasText(newCollector)) {
            throw new CustomValidationException("Le nouveau commercial est obligatoire.");
        }
        if (Objects.equals(credit.getCollector(), newCollector)) {
            throw new CustomValidationException(
                    "Le nouveau commercial doit être différent de l'actuel.");
        }

        CreditCollectorHistory history = new CreditCollectorHistory();
        history.setCredit(credit);
        history.setOldCollector(credit.getCollector());
        history.setNewCollector(newCollector);
        history.setTotalAmount(credit.getTotalAmount());
        history.setTotalAmountPaid(credit.getTotalAmountPaid());
        history.setTotalAmountRemaining(credit.getTotalAmountRemaining());
        history.setChangeDate(LocalDateTime.now());
        creditCollectorHistoryRepository.save(history);

        credit.setCollector(newCollector);
        metricsPublisher.ifPresent(m -> m.creditCollectorChanged(history.getOldCollector(), newCollector));

        Client client = credit.getClient();
        if (client != null) {
            clientService.updateRecoveryCollector(client.getId(), newCollector);
        }

        credit = creditRepository.saveAndFlush(credit);
        return CreditRespDto.fromCredit(credit);
    }

    @Transactional(readOnly = true)
    public List<CreditCollectorHistoryDto> getCollectorHistory(Long creditId) {
        return creditCollectorHistoryRepository.findByCreditIdOrderByChangeDateDesc(creditId)
                .stream()
                .map(CreditCollectorHistoryDto::fromEntity)
                .toList();
    }

    public void bulkChangeCollector(BulkChangeCollectorDto dto) {
        if (dto.getCreditIds() == null || dto.getCreditIds().isEmpty()) {
            return;
        }
        if (!StringUtils.hasText(dto.getNewCollector())) {
            throw new CustomValidationException("Le nouveau commercial est obligatoire.");
        }

        List<Long> creditIdsToUpdate = creditRepository.findAllById(dto.getCreditIds()).stream()
                .filter(credit -> !Objects.equals(credit.getCollector(), dto.getNewCollector()))
                .map(Credit::getId)
                .toList();
        if (creditIdsToUpdate.isEmpty()) {
            throw new CustomValidationException(
                    "Le nouveau commercial doit être différent de l'actuel pour au moins une vente sélectionnée.");
        }

        String username = userService.getCurrentUser().getUsername();

        creditCollectorHistoryRepository.bulkInsertHistoryForCredits(
                creditIdsToUpdate, dto.getNewCollector(), username, username);
        creditRepository.bulkUpdateCollector(creditIdsToUpdate, dto.getNewCollector());
        creditRepository.bulkUpdateClientRecoveryCollector(creditIdsToUpdate, dto.getNewCollector());
        clientService.evictClientListCaches();
    }
}
