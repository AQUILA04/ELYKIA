package com.optimize.elykia.core.service.adhesion;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.adhesion.CustomerAdhesionOverviewDto;
import com.optimize.elykia.core.dto.adhesion.CustomerAdhesionSubmissionDto;
import com.optimize.elykia.core.dto.customer.CustomerAdhesionDeclarationRequest;
import com.optimize.elykia.core.entity.customer.CustomerAdhesionSubmission;
import com.optimize.elykia.core.enumaration.AdhesionRequestKind;
import com.optimize.elykia.core.enumaration.AdhesionSource;
import com.optimize.elykia.core.enumaration.AdhesionType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.customer.CustomerAdhesionSubmissionRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerAdhesionRequestService {

    private final CustomerAdhesionSubmissionRepository submissionRepository;
    private final AdhesionService adhesionService;
    private final ClientService clientService;
    private final UserService userService;

    @Transactional(readOnly = true)
    public CustomerAdhesionOverviewDto overview(Long clientId) {
        return new CustomerAdhesionOverviewDto(
                adhesionService.listByClient(clientId),
                listSubmissions(clientId));
    }

    @Transactional(readOnly = true)
    public List<CustomerAdhesionSubmissionDto> listSubmissions(Long clientId) {
        return submissionRepository.findByClientIdAndStateOrderByIdDesc(clientId, State.ENABLED)
                .stream()
                .map(CustomerAdhesionSubmissionDto::from)
                .toList();
    }

    public CustomerAdhesionSubmissionDto declare(Client client, CustomerAdhesionDeclarationRequest request) {
        if (client == null || client.getId() == null) {
            throw new CustomValidationException("Client introuvable.");
        }
        AdhesionType type = request.getAdhesionType();
        AdhesionRequestKind kind = request.getRequestKind();
        if (kind == AdhesionRequestKind.SUBSCRIBE) {
            double expected = adhesionService.feeFor(type);
            if (Double.compare(request.getAmount(), expected) != 0) {
                throw new CustomValidationException(
                        "Le montant de l'adhésion " + AdhesionService.label(type) + " est de "
                                + (long) expected + " FCFA.");
            }
        }
        submissionRepository.findByClientIdAndAdhesionTypeAndRequestKindAndStatusAndState(
                client.getId(), type, kind, CustomerSubmissionStatus.INITIE, State.ENABLED)
                .ifPresent(existing -> {
                    throw new CustomValidationException(
                            "Une déclaration est déjà en attente pour cette adhésion.");
                });
        CustomerAdhesionSubmission submission = new CustomerAdhesionSubmission();
        submission.setClientId(client.getId());
        submission.setAdhesionType(type);
        submission.setRequestKind(kind);
        submission.setMobileMoneyPhone(request.getMobileMoneyPhone().trim());
        submission.setMobileMoneyAmount(request.getAmount());
        submission.setMobileMoneyReference(request.getMobileMoneyReference().trim());
        submission.setNotes(request.getNotes());
        submission.setStatus(CustomerSubmissionStatus.INITIE);
        return CustomerAdhesionSubmissionDto.from(submissionRepository.save(submission));
    }

    public CustomerAdhesionSubmissionDto validate(Long clientId, Long submissionId) {
        String performedBy = requireGestionnaire();
        CustomerAdhesionSubmission submission = requirePending(clientId, submissionId);
        clientService.getById(clientId);
        if (submission.getRequestKind() == AdhesionRequestKind.SUBSCRIBE) {
            adhesionService.applySubscribe(
                    clientId,
                    submission.getAdhesionType(),
                    AdhesionSource.CUSTOMER_SPACE,
                    performedBy,
                    true);
        } else {
            adhesionService.applyTopUp(
                    clientId,
                    submission.getAdhesionType(),
                    submission.getMobileMoneyAmount(),
                    performedBy,
                    true);
        }
        submission.setStatus(CustomerSubmissionStatus.VALIDE);
        submission.setValidatedBy(performedBy);
        submission.setValidatedAt(LocalDateTime.now());
        return CustomerAdhesionSubmissionDto.from(submissionRepository.save(submission));
    }

    public CustomerAdhesionSubmissionDto reject(Long clientId, Long submissionId, String reason) {
        String performedBy = requireGestionnaire();
        if (!StringUtils.hasText(reason)) {
            throw new CustomValidationException("Le motif de rejet est obligatoire.");
        }
        CustomerAdhesionSubmission submission = requirePending(clientId, submissionId);
        submission.setStatus(CustomerSubmissionStatus.REJETE);
        submission.setRejectedBy(performedBy);
        submission.setRejectedAt(LocalDateTime.now());
        submission.setRejectionReason(reason.trim());
        return CustomerAdhesionSubmissionDto.from(submissionRepository.save(submission));
    }

    private CustomerAdhesionSubmission requirePending(Long clientId, Long submissionId) {
        CustomerAdhesionSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Déclaration d'adhésion introuvable."));
        if (!clientId.equals(submission.getClientId())) {
            throw new CustomValidationException("Cette déclaration ne concerne pas ce client.");
        }
        if (submission.getStatus() != CustomerSubmissionStatus.INITIE) {
            throw new CustomValidationException("Cette déclaration a déjà été traitée.");
        }
        return submission;
    }

    private String requireGestionnaire() {
        var currentUser = userService.getCurrentUser();
        if (currentUser == null || !currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new CustomValidationException("Seul un gestionnaire peut valider une adhésion.");
        }
        return currentUser.getUsername();
    }
}
