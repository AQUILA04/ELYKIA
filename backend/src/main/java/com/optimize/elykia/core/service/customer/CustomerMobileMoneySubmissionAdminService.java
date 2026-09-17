package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.CustomerMobileMoneySubmissionDto;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.customer.CustomerMobileMoneySubmissionRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerMobileMoneySubmissionAdminService {

    private final CustomerMobileMoneySubmissionRepository submissionRepository;
    private final CreditRepository creditRepository;
    private final ClientService clientService;
    private final AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public Page<CustomerMobileMoneySubmissionDto> list(User user, CustomerSubmissionStatus status, Pageable pageable) {
        AppNotificationService.assertAudienceOrThrow(user);
        CustomerSubmissionStatus effectiveStatus = status != null ? status : CustomerSubmissionStatus.INITIE;
        Page<CustomerMobileMoneySubmission> page = submissionRepository.findByStatusOptional(
                effectiveStatus, State.ENABLED, pageable);

        List<CustomerMobileMoneySubmission> content = page.getContent();
        if (content.isEmpty()) {
            return Page.empty(pageable);
        }

        Map<Long, Client> clientsById = loadClients(content);
        Map<Long, Credit> creditsById = loadCredits(content);

        List<CustomerMobileMoneySubmissionDto> dtos = new ArrayList<>();
        for (CustomerMobileMoneySubmission submission : content) {
            Client client = clientsById.get(submission.getClientId());
            Credit credit = creditsById.get(submission.getCreditId());
            String targetCollector = resolveCollector(credit, client);
            String tontineCollector = client != null ? client.getTontineCollector() : null;
            if (AppNotificationService.isPromoterOnly(user)
                    && !AppNotificationService.matchesPromoterPortfolio(user, targetCollector, tontineCollector)) {
                continue;
            }
            dtos.add(toDto(submission, client, targetCollector, tontineCollector));
        }

        if (AppNotificationService.isPromoterOnly(user)) {
            // In-memory filter keeps pagination approximate for promoters; list sizes stay small for INITIE.
            return new PageImpl<>(dtos, pageable, dtos.size());
        }
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    public CustomerMobileMoneySubmissionDto validate(User user, Long id) {
        return transition(user, id, CustomerSubmissionStatus.VALIDE);
    }

    public CustomerMobileMoneySubmissionDto reject(User user, Long id) {
        return transition(user, id, CustomerSubmissionStatus.REJETE);
    }

    private CustomerMobileMoneySubmissionDto transition(User user, Long id, CustomerSubmissionStatus newStatus) {
        AppNotificationService.assertAudienceOrThrow(user);
        CustomerMobileMoneySubmission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Soumission introuvable."));
        if (submission.getStatus() != CustomerSubmissionStatus.INITIE) {
            throw new CustomValidationException("Seules les déclarations initiées peuvent être traitées.");
        }

        Client client = clientService.getById(submission.getClientId());
        Credit credit = creditRepository.findById(submission.getCreditId()).orElse(null);
        String targetCollector = resolveCollector(credit, client);
        String tontineCollector = client != null ? client.getTontineCollector() : null;
        if (AppNotificationService.isPromoterOnly(user)
                && !AppNotificationService.matchesPromoterPortfolio(user, targetCollector, tontineCollector)) {
            throw new CustomValidationException("Accès non autorisé à cette déclaration.");
        }

        submission.setStatus(newStatus);
        if (StringUtils.hasText(user.getUsername())) {
            submission.setLastModifiedBy(user.getUsername());
        }
        submission = submissionRepository.save(submission);
        appNotificationService.resolveByTypeAndEntityId(AppNotificationType.PAYMENT_DECLARATION, submission.getId());
        return toDto(submission, client, targetCollector, tontineCollector);
    }

    private Map<Long, Client> loadClients(List<CustomerMobileMoneySubmission> submissions) {
        return submissions.stream()
                .map(CustomerMobileMoneySubmission::getClientId)
                .filter(Objects::nonNull)
                .distinct()
                .map(id -> {
                    try {
                        return clientService.getById(id);
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Client::getId, Function.identity(), (a, b) -> a));
    }

    private Map<Long, Credit> loadCredits(List<CustomerMobileMoneySubmission> submissions) {
        return submissions.stream()
                .map(CustomerMobileMoneySubmission::getCreditId)
                .filter(Objects::nonNull)
                .distinct()
                .map(id -> creditRepository.findById(id).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Credit::getId, Function.identity(), (a, b) -> a));
    }

    private static String resolveCollector(Credit credit, Client client) {
        if (credit != null && StringUtils.hasText(credit.getCollector())) {
            return credit.getCollector();
        }
        if (client != null && StringUtils.hasText(client.getCollector())) {
            return client.getCollector();
        }
        return null;
    }

    private static CustomerMobileMoneySubmissionDto toDto(
            CustomerMobileMoneySubmission submission,
            Client client,
            String targetCollector,
            String tontineCollector) {
        return CustomerMobileMoneySubmissionDto.builder()
                .id(submission.getId())
                .clientId(submission.getClientId())
                .clientName(client != null ? client.getFullName() : null)
                .creditId(submission.getCreditId())
                .installmentNumber(submission.getInstallmentNumber())
                .expectedAmount(submission.getExpectedAmount())
                .mobileMoneyPhone(submission.getMobileMoneyPhone())
                .mobileMoneyAmount(submission.getMobileMoneyAmount())
                .mobileMoneyReference(submission.getMobileMoneyReference())
                .notes(submission.getNotes())
                .status(submission.getStatus())
                .targetCollector(targetCollector)
                .tontineCollector(tontineCollector)
                .createdAt(submission.getCreatedDate())
                .build();
    }
}
