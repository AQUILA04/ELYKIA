package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.customer.CustomerNotificationDto;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.customer.CustomerTontineMmSubmission;
import com.optimize.elykia.core.entity.notification.CustomerNotification;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.enumaration.CustomerNotificationType;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.notification.CustomerNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerNotificationService {

    private static final int DEFAULT_LIMIT = 50;
    private static final NumberFormat AMOUNT_FORMAT = NumberFormat.getIntegerInstance(Locale.FRANCE);

    private final CustomerNotificationRepository notificationRepository;
    private final CustomerContextService contextService;

    @Transactional(readOnly = true)
    public List<CustomerNotificationDto> listMine(int limit) {
        Client client = contextService.requireClient(contextService.currentUsername());
        int pageSize = limit > 0 ? Math.min(limit, 100) : DEFAULT_LIMIT;
        return notificationRepository
                .findByClientIdAndStateOrderByCreatedDateDesc(
                        client.getId(), State.ENABLED, PageRequest.of(0, pageSize))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCountMine() {
        Client client = contextService.requireClient(contextService.currentUsername());
        return notificationRepository.countByClientIdAndStateAndReadAtIsNull(client.getId(), State.ENABLED);
    }

    @Transactional
    public CustomerNotificationDto markRead(Long id) {
        Client client = contextService.requireClient(contextService.currentUsername());
        CustomerNotification notification = notificationRepository
                .findByIdAndClientIdAndState(id, client.getId(), State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("Notification introuvable."));
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }
        return toDto(notification);
    }

    @Transactional
    public int markAllRead() {
        Client client = contextService.requireClient(contextService.currentUsername());
        return notificationRepository.markAllRead(client.getId(), State.ENABLED, LocalDateTime.now());
    }

    @Transactional
    public void notifyRegistrationActivated(Client client) {
        if (client == null || client.getId() == null) {
            return;
        }
        createIfAbsent(
                CustomerNotificationType.REGISTRATION_ACTIVATED,
                client.getId(),
                client.getId(),
                null,
                "Compte activé",
                "Votre compte est activé. Bienvenue !",
                null,
                "/dashboard",
                null);
    }

    @Transactional
    public void notifyRegistrationRejected(Client client, String reason) {
        if (client == null || client.getId() == null) {
            return;
        }
        String message = StringUtils.hasText(reason)
                ? "Votre inscription n'a pas pu être validée. " + reason.trim()
                : "Votre inscription n'a pas pu être validée. Contactez votre agence.";
        createIfAbsent(
                CustomerNotificationType.REGISTRATION_REJECTED,
                client.getId(),
                client.getId(),
                null,
                "Inscription non validée",
                message,
                null,
                "/onboarding",
                null);
    }

    @Transactional
    public void notifyCreditPayment(
            CustomerMobileMoneySubmission submission,
            CustomerSubmissionStatus status) {
        if (submission == null || submission.getId() == null || submission.getClientId() == null) {
            return;
        }
        boolean validated = CustomerSubmissionStatus.VALIDE.equals(status);
        CustomerNotificationType type = validated
                ? CustomerNotificationType.CREDIT_PAYMENT_VALIDATED
                : CustomerNotificationType.CREDIT_PAYMENT_REJECTED;
        String amountLabel = formatAmount(submission.getMobileMoneyAmount());
        String title = validated ? "Paiement validé" : "Paiement refusé";
        String message = validated
                ? "Votre paiement de " + amountLabel + " a été validé."
                : "Votre paiement de " + amountLabel + " a été refusé. Contactez votre agence.";
        String linkPath = submission.getCreditId() != null
                ? "/purchases/" + submission.getCreditId()
                : "/purchases";
        createIfAbsent(
                type,
                submission.getClientId(),
                submission.getId(),
                submission.getMobileMoneyReference(),
                title,
                message,
                submission.getMobileMoneyAmount(),
                linkPath,
                null);
    }

    @Transactional
    public void notifyTontinePayment(
            CustomerTontineMmSubmission submission,
            CustomerSubmissionStatus status) {
        if (submission == null || submission.getId() == null || submission.getClientId() == null) {
            return;
        }
        boolean validated = CustomerSubmissionStatus.VALIDE.equals(status);
        CustomerNotificationType type = validated
                ? CustomerNotificationType.TONTINE_PAYMENT_VALIDATED
                : CustomerNotificationType.TONTINE_PAYMENT_REJECTED;
        String amountLabel = formatAmount(submission.getMobileMoneyAmount());
        String title = validated ? "Cotisation validée" : "Cotisation refusée";
        String message = validated
                ? "Votre cotisation tontine de " + amountLabel + " a été validée."
                : "Votre cotisation tontine de " + amountLabel + " a été refusée. Contactez votre agence.";
        String linkPath = submission.getTontineMemberId() != null
                ? "/tontines/" + submission.getTontineMemberId()
                : "/tontines";
        createIfAbsent(
                type,
                submission.getClientId(),
                submission.getId(),
                submission.getMobileMoneyReference(),
                title,
                message,
                submission.getMobileMoneyAmount(),
                linkPath,
                null);
    }

    @Transactional
    public void notifyOrderStatusChanged(Order order, OrderStatus newStatus) {
        if (order == null || order.getId() == null || order.getClient() == null
                || order.getClient().getId() == null || newStatus == null) {
            return;
        }
        String reference = "CMD-" + order.getId();
        String statusLabel = orderStatusLabel(newStatus);
        createIfAbsent(
                CustomerNotificationType.ORDER_STATUS_CHANGED,
                order.getClient().getId(),
                order.getId(),
                reference + "-" + newStatus.name(),
                "Commande " + reference,
                "Commande " + reference + " : " + statusLabel,
                order.getTotalAmount(),
                "/orders/" + order.getId(),
                null);
    }

    private void createIfAbsent(
            CustomerNotificationType type,
            Long clientId,
            Long entityId,
            String entityReference,
            String title,
            String message,
            Double amount,
            String linkPath,
            String linkQuery) {
        if (entityId != null) {
            boolean exists = StringUtils.hasText(entityReference)
                    ? notificationRepository
                    .findFirstByTypeAndEntityIdAndEntityReferenceAndClientIdAndState(
                            type, entityId, entityReference, clientId, State.ENABLED)
                    .isPresent()
                    : notificationRepository
                    .findFirstByTypeAndEntityIdAndClientIdAndState(type, entityId, clientId, State.ENABLED)
                    .isPresent();
            if (exists) {
                return;
            }
        }
        CustomerNotification notification = new CustomerNotification();
        notification.setType(type);
        notification.setClientId(clientId);
        notification.setEntityId(entityId);
        notification.setEntityReference(entityReference);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setAmount(amount);
        notification.setOperationDate(LocalDate.now());
        notification.setLinkPath(linkPath);
        notification.setLinkQuery(linkQuery);
        notificationRepository.save(notification);
        log.info("Customer notification created type={} clientId={} entityId={}", type, clientId, entityId);
    }

    private CustomerNotificationDto toDto(CustomerNotification notification) {
        return CustomerNotificationDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .entityId(notification.getEntityId())
                .entityReference(notification.getEntityReference())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .amount(notification.getAmount())
                .operationDate(notification.getOperationDate())
                .linkPath(notification.getLinkPath())
                .linkQuery(notification.getLinkQuery())
                .read(notification.getReadAt() != null)
                .createdAt(notification.getCreatedDate())
                .build();
    }

    private static String formatAmount(Double amount) {
        double value = amount != null ? amount : 0;
        return AMOUNT_FORMAT.format(Math.round(value)) + " F";
    }

    private static String orderStatusLabel(OrderStatus status) {
        return switch (Objects.requireNonNullElse(status, OrderStatus.PENDING)) {
            case PENDING -> "En attente";
            case ACCEPTED -> "Acceptée";
            case DENIED -> "Refusée";
            case CANCEL -> "Annulée";
            case SOLD -> "Livrée";
        };
    }
}
