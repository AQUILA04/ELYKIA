package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.Converter;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.enumeration.PhotoType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.CustomerIdDocumentRequest;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositDto;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositRequest;
import com.optimize.elykia.core.dto.customer.CustomerMobileMoneyRecipientDto;
import com.optimize.elykia.core.dto.customer.CustomerOnboardingStatusDto;
import com.optimize.elykia.core.entity.customer.CustomerInitialDepositSubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.customer.CustomerInitialDepositSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerOnboardingService {

    private static final EnumSet<CustomerSubmissionStatus> ACTIVE_DEPOSIT_STATUSES =
            EnumSet.of(CustomerSubmissionStatus.INITIE, CustomerSubmissionStatus.VALIDE);

    private final CustomerContextService contextService;
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final CustomerInitialDepositSubmissionRepository depositRepository;
    private final CommercialMobileMoneyConfigService commercialMobileMoneyConfigService;

    @Transactional(readOnly = true)
    public CustomerOnboardingStatusDto getStatus() {
        Client client = contextService.requireClient(contextService.currentUsername());
        return toStatus(client);
    }

    public CustomerOnboardingStatusDto uploadIdDocument(CustomerIdDocumentRequest request) {
        Client client = contextService.requireClient(contextService.currentUsername());
        assertPendingOrActiveForKyc(client);

        byte[] cardBytes = Converter.convertToByteImage(Objects.requireNonNull(request.getCardPhoto()));
        if (cardBytes == null || cardBytes.length == 0) {
            throw new CustomValidationException("La photo de la pièce d'identité est obligatoire.");
        }
        if (StringUtils.hasText(request.getCardType())) {
            client.setCardType(request.getCardType().trim());
        }
        if (StringUtils.hasText(request.getCardID())) {
            String cardId = request.getCardID().trim();
            if (clientRepository.existsByCardIDAndIdNot(cardId, client.getId())) {
                throw new CustomValidationException("Ce numéro de pièce d'identité est déjà utilisé.");
            }
            client.setCardID(cardId);
        }
        clientRepository.save(client);
        clientService.uploadPhotoWithThumb(client.getId(), cardBytes, PhotoType.CARD);
        return toStatus(clientRepository.findById(client.getId()).orElse(client));
    }

    @Transactional(readOnly = true)
    public CustomerMobileMoneyRecipientDto getInitialDepositRecipients() {
        Client client = contextService.requireClient(contextService.currentUsername());
        assertPending(client);
        return commercialMobileMoneyConfigService.resolveForCollector(client.getCollector());
    }

    public CustomerInitialDepositDto submitInitialDeposit(CustomerInitialDepositRequest request) {
        Client client = contextService.requireClient(contextService.currentUsername());
        assertPending(client);
        if (depositRepository.existsActiveForClient(client.getId(), ACTIVE_DEPOSIT_STATUSES, State.ENABLED)) {
            throw new CustomValidationException(
                    "Une déclaration de dépôt initial est déjà en cours ou validée.");
        }
        CustomerInitialDepositSubmission submission = new CustomerInitialDepositSubmission();
        submission.setClientId(client.getId());
        submission.setMobileMoneyPhone(request.getMobileMoneyPhone().trim());
        submission.setMobileMoneyAmount(request.getMobileMoneyAmount());
        submission.setMobileMoneyReference(request.getMobileMoneyReference().trim());
        submission.setNotes(StringUtils.hasText(request.getNotes()) ? request.getNotes().trim() : null);
        submission.setStatus(CustomerSubmissionStatus.INITIE);
        submission.setCreatedBy(contextService.currentUsername());
        submission.setState(State.ENABLED);
        submission = depositRepository.save(submission);
        return toDepositDto(submission);
    }

    @Transactional(readOnly = true)
    public Optional<CustomerInitialDepositDto> getInitialDeposit() {
        Client client = contextService.requireClient(contextService.currentUsername());
        return latestDeposit(client.getId()).map(this::toDepositDto);
    }

    public void assertPortalFeatureAllowed(Client client) {
        if (client == null) {
            return;
        }
        if (client.isActivationRejected()) {
            throw new CustomValidationException("Inscription refusée. Contactez votre agence.");
        }
        if (client.isActivationPending()) {
            throw new CustomValidationException(
                    "Votre compte est en attente de validation. Complétez votre dossier ou effectuez un dépôt initial.");
        }
    }

    private void assertPending(Client client) {
        if (client.isActivationRejected()) {
            throw new CustomValidationException("Inscription refusée. Contactez votre agence.");
        }
        if (!client.isActivationPending()) {
            throw new CustomValidationException("Cette action est réservée aux comptes en attente d'activation.");
        }
    }

    private void assertPendingOrActiveForKyc(Client client) {
        if (client.isActivationRejected()) {
            throw new CustomValidationException("Inscription refusée. Contactez votre agence.");
        }
        if (!client.isActivationPending() && !client.isActivationActive()) {
            throw new CustomValidationException("Impossible de mettre à jour la pièce d'identité.");
        }
    }

    private CustomerOnboardingStatusDto toStatus(Client client) {
        Optional<CustomerInitialDepositSubmission> deposit = latestDeposit(client.getId());
        String depositStatus = deposit.map(d -> d.getStatus().name()).orElse("NONE");
        Double depositAmount = deposit.map(CustomerInitialDepositSubmission::getMobileMoneyAmount).orElse(null);
        ClientActivationStatus activation = client.getActivationStatus() != null
                ? client.getActivationStatus()
                : ClientActivationStatus.ACTIVE;
        boolean idUploaded = StringUtils.hasText(client.getCardPhotoUrl())
                || (client.getIDDoc() != null && client.getIDDoc().length > 0);
        return CustomerOnboardingStatusDto.builder()
                .clientId(String.valueOf(client.getId()))
                .fullName(client.getFullName())
                .phone(client.getPhone())
                .activationStatus(activation.name())
                .idDocumentUploaded(idUploaded)
                .profilPhotoUrl(client.getProfilPhotoUrl())
                .cardPhotoUrl(client.getCardPhotoUrl())
                .cardType(client.getCardType())
                .cardID(client.getCardID())
                .initialDepositStatus(depositStatus)
                .initialDepositAmount(depositAmount)
                .activationRejectionReason(client.getActivationRejectionReason())
                .build();
    }

    private Optional<CustomerInitialDepositSubmission> latestDeposit(Long clientId) {
        List<CustomerInitialDepositSubmission> all = depositRepository.findByClientIdInAndState(
                List.of(clientId), State.ENABLED);
        return all.stream()
                .sorted((a, b) -> Long.compare(
                        b.getId() != null ? b.getId() : 0L,
                        a.getId() != null ? a.getId() : 0L))
                .findFirst();
    }

    private CustomerInitialDepositDto toDepositDto(CustomerInitialDepositSubmission submission) {
        return CustomerInitialDepositDto.builder()
                .id(submission.getId())
                .clientId(submission.getClientId())
                .mobileMoneyPhone(submission.getMobileMoneyPhone())
                .mobileMoneyAmount(submission.getMobileMoneyAmount())
                .mobileMoneyReference(submission.getMobileMoneyReference())
                .notes(submission.getNotes())
                .status(submission.getStatus())
                .validatedAt(submission.getValidatedAt())
                .validatedBy(submission.getValidatedBy())
                .rejectedAt(submission.getRejectedAt())
                .rejectedBy(submission.getRejectedBy())
                .rejectionReason(submission.getRejectionReason())
                .build();
    }
}
