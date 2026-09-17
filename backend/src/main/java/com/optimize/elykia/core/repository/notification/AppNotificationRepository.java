package com.optimize.elykia.core.repository.notification;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.entity.notification.AppNotification;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppNotificationRepository extends BaseRepository<AppNotification, Long, Long> {

    Optional<AppNotification> findByTypeAndEntityIdAndResolvedAtIsNull(
            AppNotificationType type, Long entityId);

    Optional<AppNotification> findFirstByTypeAndEntityIdOrderByIdDesc(
            AppNotificationType type, Long entityId);

    @Query("""
            SELECT n FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
            ORDER BY n.operationDate DESC, n.id DESC
            """)
    List<AppNotification> findAllUnresolved(@Param("state") State state);

    @Query("""
            SELECT n FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
              AND (UPPER(n.targetCollector) = UPPER(:username)
                   OR UPPER(n.tontineCollector) = UPPER(:username))
            ORDER BY n.operationDate DESC, n.id DESC
            """)
    List<AppNotification> findUnresolvedForCollector(
            @Param("username") String username, @Param("state") State state);

    @Query("""
            SELECT COUNT(n) FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
              AND n.id NOT IN (
                  SELECT r.notificationId FROM AppNotificationRead r
                  WHERE UPPER(r.username) = UPPER(:username)
              )
            """)
    long countUnreadUnresolvedForUser(@Param("username") String username, @Param("state") State state);

    @Query("""
            SELECT COUNT(n) FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
              AND (UPPER(n.targetCollector) = UPPER(:username)
                   OR UPPER(n.tontineCollector) = UPPER(:username))
              AND n.id NOT IN (
                  SELECT r.notificationId FROM AppNotificationRead r
                  WHERE UPPER(r.username) = UPPER(:username)
              )
            """)
    long countUnreadUnresolvedForCollector(
            @Param("username") String username, @Param("state") State state);
}
