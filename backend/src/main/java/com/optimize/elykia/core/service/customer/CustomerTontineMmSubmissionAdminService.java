package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.dto.TontineCollectionRespDto;
import com.optimize.elykia.core.dto.customer.CustomerTontineMmSubmissionDto;
import com.optimize.elykia.core.entity.customer.CustomerTontineMmSubmission;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.customer.CustomerTontineMmSubmissionRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.service.tontine.TontineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerTontineMmSubmissionAdminService {

    private final CustomerTontineMmSubmissionRepository submissionRepository;
    private final ClientService clientService;
    private final TontineMemberRepository tontineMemberRepository;
    private final TontineService tontineService;
    private final AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public Page<CustomerTontineMmSubmissionDto> list(User user, CustomerSubmissionStatus status, Pageable pageable) {
        AppNotificationService.assertAudienceOrThrow(user);
        CustomerSubmissionStatus effectiveStatus = status != null ? status : CustomerSubmissionStatus.INITIE;
        Page<CustomerTontineMmSubmission> page = submissionRepository.findByStatusOptional(
                effectiveStatus, State.ENABLED, pageable);
        if (page.isEmpty()) {
            return Page.empty(pageable);
        }

        Map<Long, Client> clientsById = loadClients(page.getContent());
        List<CustomerTontineMmSubmissionDto> dtos = new ArrayList<>();
        for (CustomerTontineMmSubmission submission : page.getContent()) {
            Client client = clientsById.get(submission.getClientId());
            String tontineCollector = client != null ? client.getTontineCollector() : null;
            if (AppNotificationService.isPromoterOnly(user)
                    && !AppNotificationService.matchesPromoterAudience(
                    user,
                    AppNotificationType.TONTINE_PAYMENT_DECLARATION,
                    tontineCollector,
                    tontineCollector)) {
                continue;
            }
            dtos.add(toDto(submission, client, tontineCollector));
        }
        if (AppNotificationService.isPromoterOnly(user)) {
            return new PageImpl<>(dtos, pageable, dtos.size());
        }
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    public CustomerTontineMmSubmissionDto validate(User user, Long id) {
        AppNotificationService.assertAudienceOrThrow(user);
        CustomerTontineMmSubmission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Soumission tontine introuvable."));
        if (submission.getStatus() != CustomerSubmissionStatus.INITIE) {
            throw new CustomValidationException("Seules les déclarations initiées peuvent être traitées.");
        }

        Client client = clientService.getById(submission.getClientId());
        String tontineCollector = client != null ? client.getTontineCollector() : null;
        if (AppNotificationService.isPromoterOnly(user)
                && !AppNotificationService.matchesPromoterAudience(
                user,
                AppNotificationType.TONTINE_PAYMENT_DECLARATION,
                tontineCollector,
                tontineCollector)) {
            throw new CustomValidationException("Accès non autorisé à cette déclaration.");
        }

        TontineMember member = tontineMemberRepository.findById(submission.getTontineMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Membre tontine introuvable."));

        TontineCollectionDto collectionDto = new TontineCollectionDto();
        collectionDto.setMemberId(member.getId());
        collectionDto.setAmount(submission.getMobileMoneyAmount());
        collectionDto.setReference("CS-TONTINE-" + submission.getId());
        collectionDto.setNotes(buildValidationNotes(submission));
        collectionDto.setCollectionDate(submission.getOperationDate());
        collectionDto.setConfirmedAmount(submission.getMobileMoneyAmount());

        TontineCollectionRespDto collection = tontineService.recordCollection(collectionDto);

        submission.setStatus(CustomerSubmissionStatus.VALIDE);
        submission.setValidatedBy(user.getUsername());
        submission.setValidatedAt(LocalDateTime.now());
        submission.setTontineCollectionId(collection != null ? collection.id() : null);
        if (StringUtils.hasText(user.getUsername())) {
            submission.setLastModifiedBy(user.getUsername());
        }
        submission = submissionRepository.save(submission);
        appNotificationService.resolveByTypeAndEntityId(
                AppNotificationType.TONTINE_PAYMENT_DECLARATION, submission.getId());
        return toDto(submission, client, tontineCollector);
    }

    public CustomerTontineMmSubmissionDto reject(User user, Long id) {
        AppNotificationService.assertAudienceOrThrow(user);
        CustomerTontineMmSubmission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Soumission tontine introuvable."));
        if (submission.getStatus() != CustomerSubmissionStatus.INITIE) {
            throw new CustomValidationException("Seules les déclarations initiées peuvent être traitées.");
        }

        Client client = clientService.getById(submission.getClientId());
        String tontineCollector = client != null ? client.getTontineCollector() : null;
        if (AppNotificationService.isPromoterOnly(user)
                && !AppNotificationService.matchesPromoterAudience(
                user,
                AppNotificationType.TONTINE_PAYMENT_DECLARATION,
                tontineCollector,
                tontineCollector)) {
            throw new CustomValidationException("Accès non autorisé à cette déclaration.");
        }

        submission.setStatus(CustomerSubmissionStatus.REJETE);
        submission.setValidatedBy(user.getUsername());
        submission.setValidatedAt(LocalDateTime.now());
        if (StringUtils.hasText(user.getUsername())) {
            submission.setLastModifiedBy(user.getUsername());
        }
        submission = submissionRepository.save(submission);
        appNotificationService.resolveByTypeAndEntityId(
                AppNotificationType.TONTINE_PAYMENT_DECLARATION, submission.getId());
        return toDto(submission, client, tontineCollector);
    }

    private Map<Long, Client> loadClients(List<CustomerTontineMmSubmission> submissions) {
        return submissions.stream()
                .map(CustomerTontineMmSubmission::getClientId)
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

    private static String buildValidationNotes(CustomerTontineMmSubmission submission) {
        StringBuilder sb = new StringBuilder("Déclaration customer-space");
        if (StringUtils.hasText(submission.getMobileMoneyReference())) {
            sb.append(" · ref MM ").append(submission.getMobileMoneyReference());
        }
        if (StringUtils.hasText(submission.getMobileMoneyPhone())) {
            sb.append(" · tel ").append(submission.getMobileMoneyPhone());
        }
        if (StringUtils.hasText(submission.getNotes())) {
            sb.append(" · ").append(submission.getNotes());
        }
        return sb.toString();
    }

    private static CustomerTontineMmSubmissionDto toDto(
            CustomerTontineMmSubmission submission,
            Client client,
            String tontineCollector) {
        return CustomerTontineMmSubmissionDto.builder()
                .id(submission.getId())
                .clientId(submission.getClientId())
                .clientName(client != null ? client.getFullName() : null)
                .tontineMemberId(submission.getTontineMemberId())
                .expectedAmount(submission.getExpectedAmount())
                .mobileMoneyPhone(submission.getMobileMoneyPhone())
                .mobileMoneyAmount(submission.getMobileMoneyAmount())
                .mobileMoneyReference(submission.getMobileMoneyReference())
                .notes(submission.getNotes())
                .operationDate(submission.getOperationDate())
                .status(submission.getStatus())
                .tontineCollector(tontineCollector)
                .tontineCollectionId(submission.getTontineCollectionId())
                .createdAt(submission.getCreatedDate())
                .build();
    }
}
