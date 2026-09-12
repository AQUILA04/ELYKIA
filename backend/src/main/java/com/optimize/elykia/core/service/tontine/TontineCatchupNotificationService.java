package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.dto.TontineCatchupNotificationDto;
import com.optimize.elykia.core.dto.TontineCatchupNotificationGroupDto;
import com.optimize.elykia.core.entity.tontine.TontineCatchupNotification;
import com.optimize.elykia.core.entity.tontine.TontineCatchupNotificationRead;
import com.optimize.elykia.core.event.TontineCollectionEvent;
import com.optimize.elykia.core.repository.TontineCatchupNotificationReadRepository;
import com.optimize.elykia.core.repository.TontineCatchupNotificationRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
public class TontineCatchupNotificationService {

    private final TontineCatchupNotificationRepository notificationRepository;
    private final TontineCatchupNotificationReadRepository readRepository;

    @Transactional
    public void createFromCatchupEvent(TontineCollectionEvent event) {
        if (event == null || !event.isCatchup()) {
            return;
        }
        if (event.getCollectionId() != null
                && notificationRepository.findByCollectionId(event.getCollectionId()).isPresent()) {
            return;
        }
        TontineCatchupNotification notification = new TontineCatchupNotification();
        notification.setCommercialUsername(event.getCollector());
        notification.setOperationDate(event.getOperationDate());
        notification.setCaptureDate(event.getCaptureDate());
        notification.setAmount(event.getAmount() != null ? event.getAmount() : 0.0);
        notification.setCollectionId(event.getCollectionId());
        notification.setCollectionReference(event.getCollectionReference());
        notification.setClientName(event.getClientName());
        notificationRepository.save(notification);
        log.info("Catch-up notification created commercial={} operationDate={} amount={}",
                event.getCollector(), event.getOperationDate(), event.getAmount());
    }

    @Transactional
    public void cancelByCollectionId(Long collectionId) {
        if (collectionId == null) {
            return;
        }
        notificationRepository.findByCollectionId(collectionId).ifPresent(notification -> {
            notification.setState(State.DELETED);
            notificationRepository.save(notification);
        });
    }

    @Transactional(readOnly = true)
    public long unreadCount(User user) {
        assertSecretaryOrManager(user);
        return notificationRepository.countUnreadForUser(user.getUsername(), State.ENABLED);
    }

    @Transactional(readOnly = true)
    public List<TontineCatchupNotificationGroupDto> listGrouped(User user) {
        assertSecretaryOrManager(user);
        List<TontineCatchupNotification> notifications =
                notificationRepository.findAllEnabled(State.ENABLED);
        if (notifications.isEmpty()) {
            return List.of();
        }
        Set<Long> ids = notifications.stream()
                .map(TontineCatchupNotification::getId)
                .collect(Collectors.toSet());
        Set<Long> readIds = readRepository
                .findByUsernameIgnoreCaseAndNotificationIdIn(user.getUsername(), ids)
                .stream()
                .map(TontineCatchupNotificationRead::getNotificationId)
                .collect(Collectors.toSet());

        Map<java.time.LocalDate, List<TontineCatchupNotificationDto>> grouped = new LinkedHashMap<>();
        for (TontineCatchupNotification n : notifications) {
            TontineCatchupNotificationDto dto = new TontineCatchupNotificationDto(
                    n.getId(),
                    n.getCommercialUsername(),
                    n.getOperationDate(),
                    n.getCaptureDate(),
                    n.getAmount(),
                    n.getClientName(),
                    n.getCollectionReference(),
                    readIds.contains(n.getId()));
            grouped.computeIfAbsent(n.getOperationDate(), d -> new ArrayList<>()).add(dto);
        }
        return grouped.entrySet().stream()
                .map(e -> new TontineCatchupNotificationGroupDto(e.getKey(), e.getValue()))
                .toList();
    }

    @Transactional
    public void markRead(User user, Long notificationId) {
        assertSecretaryOrManager(user);
        Objects.requireNonNull(notificationId, "notificationId");
        TontineCatchupNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomValidationException("Notification introuvable."));
        if (notification.isDeleted()) {
            throw new CustomValidationException("Notification introuvable.");
        }
        if (readRepository.existsByNotificationIdAndUsernameIgnoreCase(notificationId, user.getUsername())) {
            return;
        }
        TontineCatchupNotificationRead read = new TontineCatchupNotificationRead();
        read.setNotificationId(notificationId);
        read.setUsername(user.getUsername());
        read.setReadAt(LocalDateTime.now());
        readRepository.save(read);
    }

    @Transactional
    public void markAllRead(User user) {
        assertSecretaryOrManager(user);
        List<TontineCatchupNotification> notifications =
                notificationRepository.findAllEnabled(State.ENABLED);
        if (notifications.isEmpty()) {
            return;
        }
        Set<Long> ids = notifications.stream()
                .map(TontineCatchupNotification::getId)
                .collect(Collectors.toSet());
        Set<Long> alreadyRead = readRepository
                .findByUsernameIgnoreCaseAndNotificationIdIn(user.getUsername(), ids)
                .stream()
                .map(TontineCatchupNotificationRead::getNotificationId)
                .collect(Collectors.toSet());
        for (Long id : ids) {
            if (alreadyRead.contains(id)) {
                continue;
            }
            TontineCatchupNotificationRead read = new TontineCatchupNotificationRead();
            read.setNotificationId(id);
            read.setUsername(user.getUsername());
            read.setReadAt(LocalDateTime.now());
            readRepository.save(read);
        }
    }

    private static void assertSecretaryOrManager(User user) {
        if (user == null || !StringUtils.hasText(user.getUsername())) {
            throw new CustomValidationException("Utilisateur non authentifié.");
        }
        boolean allowed = user.is(UserProfilConstant.SECRETARY)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN);
        if (!allowed) {
            throw new CustomValidationException("Accès réservé au secrétaire et au gestionnaire.");
        }
    }
}
