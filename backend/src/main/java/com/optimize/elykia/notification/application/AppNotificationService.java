package com.optimize.elykia.notification.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.notification.api.AppNotificationFacade;
import com.optimize.elykia.notification.api.AppNotificationType;
import com.optimize.elykia.notification.api.CustomerOrderNotificationCommand;
import com.optimize.elykia.notification.api.PaymentDeclarationNotificationCommand;
import com.optimize.elykia.notification.api.TontineCatchupNotificationCommand;
import com.optimize.elykia.notification.api.TontinePaymentDeclarationNotificationCommand;
import com.optimize.elykia.notification.domain.AppNotification;
import com.optimize.elykia.notification.domain.AppNotificationRead;
import com.optimize.elykia.notification.infrastructure.persistence.AppNotificationReadRepository;
import com.optimize.elykia.notification.infrastructure.persistence.AppNotificationRepository;
import com.optimize.elykia.notification.web.dto.AppNotificationDto;
import com.optimize.elykia.notification.web.dto.AppNotificationGroupDto;
import com.optimize.elykia.shared.security.CollectorAudienceSecurity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppNotificationService implements AppNotificationFacade {

    private final AppNotificationRepository notificationRepository;
    private final AppNotificationReadRepository readRepository;

    @Override
    @Transactional
    public void createPaymentDeclaration(PaymentDeclarationNotificationCommand command) {
        if (command == null || command.submissionId() == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(
                        AppNotificationType.PAYMENT_DECLARATION, command.submissionId())
                .isPresent()) {
            return;
        }
        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.PAYMENT_DECLARATION);
        notification.setEntityId(command.submissionId());
        notification.setEntityReference(command.mobileMoneyReference());
        notification.setTitle("Déclaration de paiement");
        notification.setMessage(buildPaymentMessage(
                command.clientName(), command.installmentNumber(), command.mobileMoneyAmount()));
        notification.setClientId(command.clientId());
        notification.setClientName(command.clientName());
        notification.setTargetCollector(command.targetCollector());
        notification.setTontineCollector(command.tontineCollector());
        notification.setOperationDate(LocalDate.now());
        notification.setAmount(command.mobileMoneyAmount());
        notification.setLinkPath("/customer-payments");
        notification.setLinkQuery("id=" + command.submissionId());
        notificationRepository.save(notification);
        log.info("PAYMENT_DECLARATION notification created submissionId={} collector={}",
                command.submissionId(), command.targetCollector());
    }

    @Override
    @Transactional
    public void createCustomerOrder(CustomerOrderNotificationCommand command) {
        if (command == null || command.orderId() == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(
                        AppNotificationType.CUSTOMER_ORDER, command.orderId())
                .isPresent()) {
            return;
        }
        String clientName = command.clientName();
        String reference = "CMD-" + command.orderId();

        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.CUSTOMER_ORDER);
        notification.setEntityId(command.orderId());
        notification.setEntityReference(reference);
        notification.setTitle("Commande client");
        notification.setMessage((clientName != null ? clientName : "Client") + " · " + reference);
        notification.setClientId(command.clientId());
        notification.setClientName(clientName);
        notification.setTargetCollector(command.targetCollector());
        notification.setTontineCollector(command.tontineCollector());
        notification.setOperationDate(command.operationDate() != null
                ? command.operationDate()
                : LocalDate.now());
        notification.setAmount(command.totalAmount());
        notification.setLinkPath("/orders/details/" + command.orderId());
        notification.setLinkQuery(null);
        notificationRepository.save(notification);
        log.info("CUSTOMER_ORDER notification created orderId={} collector={}",
                command.orderId(), command.targetCollector());
    }

    @Override
    @Transactional
    public void createTontinePaymentDeclaration(TontinePaymentDeclarationNotificationCommand command) {
        if (command == null || command.submissionId() == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(
                        AppNotificationType.TONTINE_PAYMENT_DECLARATION, command.submissionId())
                .isPresent()) {
            return;
        }
        String clientName = command.clientName();

        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.TONTINE_PAYMENT_DECLARATION);
        notification.setEntityId(command.submissionId());
        notification.setEntityReference(command.mobileMoneyReference());
        notification.setTitle("Déclaration cotisation tontine");
        notification.setMessage((clientName != null ? clientName : "Client")
                + " · " + (command.mobileMoneyAmount() != null
                ? command.mobileMoneyAmount().longValue() + " XOF"
                : ""));
        notification.setClientId(command.clientId());
        notification.setClientName(clientName);
        notification.setTargetCollector(command.tontineCollector());
        notification.setTontineCollector(command.tontineCollector());
        notification.setOperationDate(command.operationDate() != null
                ? command.operationDate()
                : LocalDate.now());
        notification.setAmount(command.mobileMoneyAmount());
        notification.setLinkPath("/customer-payments");
        notification.setLinkQuery("tab=tontine&id=" + command.submissionId());
        notificationRepository.save(notification);
        log.info("TONTINE_PAYMENT_DECLARATION notification created submissionId={} tontineCollector={}",
                command.submissionId(), command.tontineCollector());
    }

    @Override
    @Transactional
    public void createFromCatchupEvent(TontineCatchupNotificationCommand command) {
        if (command == null || !command.catchup()) {
            return;
        }
        if (command.collectionId() != null
                && notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(
                        AppNotificationType.TONTINE_CATCHUP, command.collectionId())
                .isPresent()) {
            return;
        }
        String collector = command.collector();
        LocalDate operationDate = command.operationDate();
        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.TONTINE_CATCHUP);
        notification.setEntityId(command.collectionId());
        notification.setEntityReference(command.collectionReference());
        notification.setTitle("Rattrapage tontine");
        notification.setMessage((command.clientName() != null ? command.clientName() : "Client")
                + " · " + (collector != null ? collector : ""));
        notification.setClientName(command.clientName());
        notification.setTargetCollector(collector);
        // Audience PROMOTER for tontine = tontineCollector only (not credit collector).
        notification.setTontineCollector(collector);
        notification.setOperationDate(operationDate);
        notification.setAmount(command.amount() != null ? command.amount() : 0.0);
        notification.setLinkPath("/report/daily");
        notification.setLinkQuery("collector=" + nullToEmpty(collector)
                + "&startDate=" + (operationDate != null ? operationDate : "")
                + "&endDate=" + (operationDate != null ? operationDate : ""));
        notificationRepository.save(notification);
        log.info("TONTINE_CATCHUP notification created commercial={} operationDate={} amount={}",
                collector, operationDate, command.amount());
    }

    @Override
    @Transactional
    public void resolveByTypeAndEntityId(AppNotificationType type, Long entityId) {
        if (type == null || entityId == null) {
            return;
        }
        notificationRepository.findByTypeAndEntityIdAndResolvedAtIsNull(type, entityId).ifPresent(notification -> {
            notification.setResolvedAt(LocalDateTime.now());
            notificationRepository.save(notification);
            log.info("Resolved notification type={} entityId={}", type, entityId);
        });
    }

    @Override
    @Transactional
    public void cancelCatchupByCollectionId(Long collectionId) {
        if (collectionId == null) {
            return;
        }
        notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(AppNotificationType.TONTINE_CATCHUP, collectionId)
                .ifPresent(notification -> {
                    notification.setState(State.DELETED);
                    notification.setResolvedAt(LocalDateTime.now());
                    notificationRepository.save(notification);
                });
    }

    @Override
    @Transactional
    public void cancelUnresolvedByTypeAndEntityIds(AppNotificationType type, List<Long> entityIds) {
        if (type == null || entityIds == null || entityIds.isEmpty()) {
            return;
        }
        notificationRepository.cancelUnresolvedByTypeAndEntityIds(type, entityIds, LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public long unreadCount(User user) {
        assertNotificationAudience(user);
        if (isPromoterOnly(user)) {
            return notificationRepository.countUnreadUnresolvedForPromoter(user.getUsername(), State.ENABLED);
        }
        return notificationRepository.countUnreadUnresolvedForUser(user.getUsername(), State.ENABLED);
    }

    /**
     * Unread unresolved count excluding {@code TONTINE_CATCHUP}.
     * Login toast must not fire when only catchups remain.
     */
    @Transactional(readOnly = true)
    public long unreadCountExcludingCatchup(User user) {
        assertNotificationAudience(user);
        if (isPromoterOnly(user)) {
            return notificationRepository.countUnreadUnresolvedExcludingCatchupForPromoter(
                    user.getUsername(), State.ENABLED);
        }
        return notificationRepository.countUnreadUnresolvedExcludingCatchupForUser(
                user.getUsername(), State.ENABLED);
    }

    @Transactional(readOnly = true)
    public List<AppNotificationGroupDto> listGrouped(User user) {
        assertNotificationAudience(user);
        List<AppNotification> notifications = isPromoterOnly(user)
                ? notificationRepository.findUnresolvedForPromoter(user.getUsername(), State.ENABLED)
                : notificationRepository.findAllUnresolved(State.ENABLED);
        if (notifications.isEmpty()) {
            return List.of();
        }
        Set<Long> ids = notifications.stream().map(AppNotification::getId).collect(Collectors.toSet());
        Set<Long> readIds = readRepository
                .findByUsernameIgnoreCaseAndNotificationIdIn(user.getUsername(), ids)
                .stream()
                .map(AppNotificationRead::getNotificationId)
                .collect(Collectors.toSet());

        Map<LocalDate, List<AppNotificationDto>> grouped = new LinkedHashMap<>();
        for (AppNotification n : notifications) {
            LocalDate key = n.getOperationDate() != null ? n.getOperationDate() : LocalDate.EPOCH;
            grouped.computeIfAbsent(key, d -> new ArrayList<>()).add(toDto(n, readIds.contains(n.getId())));
        }
        return grouped.entrySet().stream()
                .map(e -> new AppNotificationGroupDto(e.getKey(), e.getValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppNotificationDto> listFlat(User user) {
        return listGrouped(user).stream()
                .flatMap(g -> g.items().stream())
                .toList();
    }

    @Transactional
    public void markRead(User user, Long notificationId) {
        assertNotificationAudience(user);
        Objects.requireNonNull(notificationId, "notificationId");
        AppNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomValidationException("Notification introuvable."));
        if (notification.isDeleted()) {
            throw new CustomValidationException("Notification introuvable.");
        }
        assertCanAccess(user, notification);
        if (readRepository.existsByNotificationIdAndUsernameIgnoreCase(notificationId, user.getUsername())) {
            return;
        }
        AppNotificationRead read = new AppNotificationRead();
        read.setNotificationId(notificationId);
        read.setUsername(user.getUsername());
        read.setReadAt(LocalDateTime.now());
        readRepository.save(read);
    }

    @Transactional
    public void markAllRead(User user) {
        assertNotificationAudience(user);
        List<AppNotification> notifications = isPromoterOnly(user)
                ? notificationRepository.findUnresolvedForPromoter(user.getUsername(), State.ENABLED)
                : notificationRepository.findAllUnresolved(State.ENABLED);
        if (notifications.isEmpty()) {
            return;
        }
        Set<Long> ids = notifications.stream().map(AppNotification::getId).collect(Collectors.toSet());
        Set<Long> alreadyRead = readRepository
                .findByUsernameIgnoreCaseAndNotificationIdIn(user.getUsername(), ids)
                .stream()
                .map(AppNotificationRead::getNotificationId)
                .collect(Collectors.toSet());
        for (Long id : ids) {
            if (alreadyRead.contains(id)) {
                continue;
            }
            AppNotificationRead read = new AppNotificationRead();
            read.setNotificationId(id);
            read.setUsername(user.getUsername());
            read.setReadAt(LocalDateTime.now());
            readRepository.save(read);
        }
    }

    public static boolean isNotificationAudience(User user) {
        return CollectorAudienceSecurity.isNotificationAudience(user);
    }

    public static void assertAudienceOrThrow(User user) {
        CollectorAudienceSecurity.assertAudienceOrThrow(user);
    }

    public static boolean isStaffAllAccess(User user) {
        return CollectorAudienceSecurity.isStaffAllAccess(user);
    }

    public static boolean isPromoterOnly(User user) {
        return CollectorAudienceSecurity.isPromoterOnly(user);
    }

    public static boolean matchesPromoterAudience(
            User user,
            AppNotificationType type,
            String targetCollector,
            String tontineCollector) {
        return AppNotificationFacade.matchesPromoterAudience(user, type, targetCollector, tontineCollector);
    }

    public static boolean matchesCreditCollector(User user, String collector) {
        return CollectorAudienceSecurity.matchesCreditCollector(user, collector);
    }

    public static boolean matchesTontineCollector(User user, String tontineCollector) {
        return CollectorAudienceSecurity.matchesTontineCollector(user, tontineCollector);
    }

    public static void assertPromoterOwnsCreditCollector(User user, String collector) {
        CollectorAudienceSecurity.assertPromoterOwnsCreditCollector(user, collector);
    }

    public static void assertPromoterOwnsTontineCollector(User user, String tontineCollector) {
        CollectorAudienceSecurity.assertPromoterOwnsTontineCollector(user, tontineCollector);
    }

    private void assertNotificationAudience(User user) {
        CollectorAudienceSecurity.assertAudienceOrThrow(user);
    }

    private void assertCanAccess(User user, AppNotification notification) {
        if (CollectorAudienceSecurity.isStaffAllAccess(user)) {
            return;
        }
        if (!AppNotificationFacade.matchesPromoterAudience(
                user,
                notification.getType(),
                notification.getTargetCollector(),
                notification.getTontineCollector())) {
            throw new CustomValidationException("Accès non autorisé à cette notification.");
        }
    }

    private static AppNotificationDto toDto(AppNotification n, boolean read) {
        return new AppNotificationDto(
                n.getId(),
                n.getType(),
                n.getEntityId(),
                n.getEntityReference(),
                n.getTitle(),
                n.getMessage(),
                n.getClientId(),
                n.getClientName(),
                n.getTargetCollector(),
                n.getTontineCollector(),
                n.getOperationDate(),
                n.getAmount(),
                n.getLinkPath(),
                n.getLinkQuery(),
                read,
                n.getResolvedAt() != null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyCarnetEcart(String commercialUsername, String clientName, Long controlId,
            String referenceKey, double amount) {
        if (!StringUtils.hasText(commercialUsername) || controlId == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndEntityReferenceAndResolvedAtIsNull(
                        AppNotificationType.CARNET_ECART, controlId, referenceKey)
                .isPresent()) {
            return;
        }
        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.CARNET_ECART);
        notification.setEntityId(controlId);
        notification.setEntityReference(referenceKey);
        notification.setTitle("Écart de carnet");
        notification.setMessage((clientName != null ? clientName : "Client")
                + " · écart de carnet à traiter"
                + (amount > 0 ? " · " + Math.round(amount) + " FCFA" : ""));
        notification.setClientName(clientName);
        notification.setTargetCollector(commercialUsername.trim());
        notification.setOperationDate(LocalDate.now());
        notification.setAmount(amount);
        notification.setLinkPath("/carnet-ecarts");
        notificationRepository.save(notification);
    }

    private static String buildPaymentMessage(
            String clientName, Integer installmentNumber, Double mobileMoneyAmount) {
        StringBuilder sb = new StringBuilder();
        sb.append(clientName != null ? clientName : "Client");
        if (installmentNumber != null) {
            sb.append(" · échéance ").append(installmentNumber);
        }
        if (mobileMoneyAmount != null) {
            sb.append(" · ").append(mobileMoneyAmount.longValue()).append(" XOF");
        }
        return sb.toString();
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
