package com.optimize.elykia.core.repository.notification;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.notification.CustomerNotification;
import com.optimize.elykia.core.enumaration.CustomerNotificationType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CustomerNotificationRepository extends JpaRepository<CustomerNotification, Long> {

    List<CustomerNotification> findByClientIdAndStateOrderByCreatedDateDesc(
            Long clientId, State state, Pageable pageable);

    long countByClientIdAndStateAndReadAtIsNull(Long clientId, State state);

    Optional<CustomerNotification> findByIdAndClientIdAndState(Long id, Long clientId, State state);

    Optional<CustomerNotification> findFirstByTypeAndEntityIdAndClientIdAndState(
            CustomerNotificationType type, Long entityId, Long clientId, State state);

    Optional<CustomerNotification> findFirstByTypeAndEntityIdAndEntityReferenceAndClientIdAndState(
            CustomerNotificationType type,
            Long entityId,
            String entityReference,
            Long clientId,
            State state);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE CustomerNotification n
            SET n.readAt = :readAt
            WHERE n.clientId = :clientId
              AND n.state = :state
              AND n.readAt IS NULL
            """)
    int markAllRead(
            @Param("clientId") Long clientId,
            @Param("state") State state,
            @Param("readAt") LocalDateTime readAt);
}
