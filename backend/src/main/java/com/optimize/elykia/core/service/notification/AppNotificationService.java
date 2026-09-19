package com.optimize.elykia.core.service.notification;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.notification.AppNotificationDto;
import com.optimize.elykia.core.dto.notification.AppNotificationGroupDto;
import com.optimize.elykia.core.entity.customer.CustomerMobileMoneySubmission;
import com.optimize.elykia.core.entity.customer.CustomerTontineMmSubmission;
import com.optimize.elykia.core.entity.notification.AppNotification;
import com.optimize.elykia.core.entity.notification.AppNotificationRead;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.event.TontineCollectionEvent;
import com.optimize.elykia.core.repository.notification.AppNotificationReadRepository;
import com.optimize.elykia.core.repository.notification.AppNotificationRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
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
public class AppNotificationService {

    private final AppNotificationRepository notificationRepository;
    private final AppNotificationReadRepository readRepository;

    @Transactional
    public void createPaymentDeclaration(CustomerMobileMoneySubmission submission, Credit credit, Client client) {
        if (submission == null || submission.getId() == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(AppNotificationType.PAYMENT_DECLARATION, submission.getId())
                .isPresent()) {
            return;
        }
        String targetCollector = resolveCreditCollector(credit, client);
        // Metadata only: PROMOTER audience for PAYMENT_DECLARATION is targetCollector (recouvrement).
        String tontineCollector = client != null ? client.getTontineCollector() : null;
        String clientName = client != null ? client.getFullName() : null;

        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.PAYMENT_DECLARATION);
        notification.setEntityId(submission.getId());
        notification.setEntityReference(submission.getMobileMoneyReference());
        notification.setTitle("Déclaration de paiement");
        notification.setMessage(buildPaymentMessage(clientName, submission));
        notification.setClientId(client != null ? client.getId() : submission.getClientId());
        notification.setClientName(clientName);
        notification.setTargetCollector(targetCollector);
        notification.setTontineCollector(tontineCollector);
        notification.setOperationDate(LocalDate.now());
        notification.setAmount(submission.getMobileMoneyAmount());
        notification.setLinkPath("/customer-payments");
        notification.setLinkQuery("id=" + submission.getId());
        notificationRepository.save(notification);
        log.info("PAYMENT_DECLARATION notification created submissionId={} collector={}",
                submission.getId(), targetCollector);
    }

    @Transactional
    public void createCustomerOrder(Order order, Client client) {
        if (order == null || order.getId() == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(AppNotificationType.CUSTOMER_ORDER, order.getId())
                .isPresent()) {
            return;
        }
        String targetCollector = client != null ? client.getCollector() : null;
        // Metadata only: PROMOTER audience for CUSTOMER_ORDER is targetCollector (commercial crédit).
        String tontineCollector = client != null ? client.getTontineCollector() : null;
        String clientName = client != null ? client.getFullName() : null;
        String reference = "CMD-" + order.getId();

        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.CUSTOMER_ORDER);
        notification.setEntityId(order.getId());
        notification.setEntityReference(reference);
        notification.setTitle("Commande client");
        notification.setMessage((clientName != null ? clientName : "Client") + " · " + reference);
        notification.setClientId(client != null ? client.getId() : null);
        notification.setClientName(clientName);
        notification.setTargetCollector(targetCollector);
        notification.setTontineCollector(tontineCollector);
        notification.setOperationDate(order.getOrderDate() != null
                ? order.getOrderDate().toLocalDate()
                : LocalDate.now());
        notification.setAmount(order.getTotalAmount());
        notification.setLinkPath("/orders/details/" + order.getId());
        notification.setLinkQuery(null);
        notificationRepository.save(notification);
        log.info("CUSTOMER_ORDER notification created orderId={} collector={}", order.getId(), targetCollector);
    }

    @Transactional
    public void createTontinePaymentDeclaration(CustomerTontineMmSubmission submission, Client client) {
        if (submission == null || submission.getId() == null) {
            return;
        }
        if (notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(
                        AppNotificationType.TONTINE_PAYMENT_DECLARATION, submission.getId())
                .isPresent()) {
            return;
        }
        String tontineCollector = client != null ? client.getTontineCollector() : null;
        String clientName = client != null ? client.getFullName() : null;

        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.TONTINE_PAYMENT_DECLARATION);
        notification.setEntityId(submission.getId());
        notification.setEntityReference(submission.getMobileMoneyReference());
        notification.setTitle("Déclaration cotisation tontine");
        notification.setMessage((clientName != null ? clientName : "Client")
                + " · " + (submission.getMobileMoneyAmount() != null
                ? submission.getMobileMoneyAmount().longValue() + " XOF"
                : ""));
        notification.setClientId(client != null ? client.getId() : submission.getClientId());
        notification.setClientName(clientName);
        notification.setTargetCollector(tontineCollector);
        notification.setTontineCollector(tontineCollector);
        notification.setOperationDate(submission.getOperationDate() != null
                ? submission.getOperationDate()
                : LocalDate.now());
        notification.setAmount(submission.getMobileMoneyAmount());
        notification.setLinkPath("/customer-payments");
        notification.setLinkQuery("tab=tontine&id=" + submission.getId());
        notificationRepository.save(notification);
        log.info("TONTINE_PAYMENT_DECLARATION notification created submissionId={} tontineCollector={}",
                submission.getId(), tontineCollector);
    }

    @Transactional
    public void createFromCatchupEvent(TontineCollectionEvent event) {
        if (event == null || !event.isCatchup()) {
            return;
        }
        if (event.getCollectionId() != null
                && notificationRepository
                .findByTypeAndEntityIdAndResolvedAtIsNull(AppNotificationType.TONTINE_CATCHUP, event.getCollectionId())
                .isPresent()) {
            return;
        }
        String collector = event.getCollector();
        LocalDate operationDate = event.getOperationDate();
        AppNotification notification = new AppNotification();
        notification.setType(AppNotificationType.TONTINE_CATCHUP);
        notification.setEntityId(event.getCollectionId());
        notification.setEntityReference(event.getCollectionReference());
        notification.setTitle("Rattrapage tontine");
        notification.setMessage((event.getClientName() != null ? event.getClientName() : "Client")
                + " · " + (collector != null ? collector : ""));
        notification.setClientName(event.getClientName());
        notification.setTargetCollector(collector);
        // Audience PROMOTER for tontine = tontineCollector only (not credit collector).
        notification.setTontineCollector(collector);
        notification.setOperationDate(operationDate);
        notification.setAmount(event.getAmount() != null ? event.getAmount() : 0.0);
        notification.setLinkPath("/report/daily");
        notification.setLinkQuery("collector=" + nullToEmpty(collector)
                + "&startDate=" + (operationDate != null ? operationDate : "")
                + "&endDate=" + (operationDate != null ? operationDate : ""));
        notificationRepository.save(notification);
        log.info("TONTINE_CATCHUP notification created commercial={} operationDate={} amount={}",
                collector, operationDate, event.getAmount());
    }

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

    @Transactional(readOnly = true)
    public long unreadCount(User user) {
        assertNotificationAudience(user);
        if (isPromoterOnly(user)) {
            return notificationRepository.countUnreadUnresolvedForPromoter(user.getUsername(), State.ENABLED);
        }
        return notificationRepository.countUnreadUnresolvedForUser(user.getUsername(), State.ENABLED);
    }

    /**
     * Unread count for the post-login toast: payment declarations and customer orders only
     * (excludes tontine catch-up / rattrapage notifications).
     */
    @Transactional(readOnly = true)
    public long unreadCountForLoginToast(User user) {
        assertNotificationAudience(user);
        if (isPromoterOnly(user)) {
            return notificationRepository.countUnreadLoginToastForPromoter(user.getUsername(), State.ENABLED);
        }
        return notificationRepository.countUnreadLoginToastForUser(user.getUsername(), State.ENABLED);
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
        if (user == null || !StringUtils.hasText(user.getUsername())) {
            return false;
        }
        return user.is(UserProfilConstant.SECRETARY)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.PROMOTER);
    }

    public static void assertAudienceOrThrow(User user) {
        if (!isNotificationAudience(user)) {
            throw new CustomValidationException(
                    "Accès réservé au secrétaire, gestionnaire, admin et commercial.");
        }
    }

    public static boolean isStaffAllAccess(User user) {
        return user != null && (user.is(UserProfilConstant.SECRETARY)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN));
    }

    public static boolean isPromoterOnly(User user) {
        return user != null
                && user.is(UserProfilConstant.PROMOTER)
                && !isStaffAllAccess(user);
    }

    /**
     * Type-scoped PROMOTER audience:
     * <ul>
     *   <li>{@code PAYMENT_DECLARATION} / {@code CUSTOMER_ORDER} → credit {@code targetCollector} only</li>
     *   <li>{@code TONTINE_CATCHUP} → {@code tontineCollector} only (fallback {@code targetCollector})</li>
     * </ul>
     * A commercial who is only {@code client.collector} must not receive tontine notifications,
     * and a commercial who is only {@code client.tontineCollector} must not receive recovery/order notifications.
     */
    public static boolean matchesPromoterAudience(
            User user,
            AppNotificationType type,
            String targetCollector,
            String tontineCollector) {
        if (user == null || !StringUtils.hasText(user.getUsername()) || type == null) {
            return false;
        }
        String username = user.getUsername();
        return switch (type) {
            case PAYMENT_DECLARATION, CUSTOMER_ORDER ->
                    username.equalsIgnoreCase(nullToEmpty(targetCollector));
            case TONTINE_CATCHUP, TONTINE_PAYMENT_DECLARATION -> {
                if (StringUtils.hasText(tontineCollector)) {
                    yield username.equalsIgnoreCase(tontineCollector);
                }
                yield username.equalsIgnoreCase(nullToEmpty(targetCollector));
            }
        };
    }

    /** Credit recovery / order portfolio: match {@code collector} only (not tontineCollector). */
    public static boolean matchesCreditCollector(User user, String collector) {
        if (user == null || !StringUtils.hasText(user.getUsername())) {
            return false;
        }
        return user.getUsername().equalsIgnoreCase(nullToEmpty(collector));
    }

    private void assertNotificationAudience(User user) {
        assertAudienceOrThrow(user);
    }

    private void assertCanAccess(User user, AppNotification notification) {
        if (isStaffAllAccess(user)) {
            return;
        }
        if (!matchesPromoterAudience(
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

    private static String resolveCreditCollector(Credit credit, Client client) {
        if (credit != null && StringUtils.hasText(credit.getCollector())) {
            return credit.getCollector();
        }
        if (client != null && StringUtils.hasText(client.getCollector())) {
            return client.getCollector();
        }
        return null;
    }

    private static String buildPaymentMessage(String clientName, CustomerMobileMoneySubmission submission) {
        StringBuilder sb = new StringBuilder();
        sb.append(clientName != null ? clientName : "Client");
        if (submission.getInstallmentNumber() != null) {
            sb.append(" · échéance ").append(submission.getInstallmentNumber());
        }
        if (submission.getMobileMoneyAmount() != null) {
            sb.append(" · ").append(submission.getMobileMoneyAmount().longValue()).append(" XOF");
        }
        return sb.toString();
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
