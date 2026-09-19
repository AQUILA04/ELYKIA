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

    /**
     * PROMOTER audience is type-scoped:
     * - PAYMENT_DECLARATION / CUSTOMER_ORDER → credit {@code targetCollector} only
     * - TONTINE_CATCHUP / TONTINE_PAYMENT_DECLARATION → {@code tontineCollector}
     *   (fallback {@code targetCollector}) only
     */
    @Query("""
            SELECT n FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
              AND (
                    (n.type IN (com.optimize.elykia.core.enumaration.AppNotificationType.PAYMENT_DECLARATION,
                                com.optimize.elykia.core.enumaration.AppNotificationType.CUSTOMER_ORDER)
                     AND UPPER(n.targetCollector) = UPPER(:username))
                 OR (n.type IN (com.optimize.elykia.core.enumaration.AppNotificationType.TONTINE_CATCHUP,
                                com.optimize.elykia.core.enumaration.AppNotificationType.TONTINE_PAYMENT_DECLARATION)
                     AND (
                          UPPER(n.tontineCollector) = UPPER(:username)
                          OR (n.tontineCollector IS NULL AND UPPER(n.targetCollector) = UPPER(:username))
                     ))
              )
            ORDER BY n.operationDate DESC, n.id DESC
            """)
    List<AppNotification> findUnresolvedForPromoter(
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
              AND (
                    (n.type IN (com.optimize.elykia.core.enumaration.AppNotificationType.PAYMENT_DECLARATION,
                                com.optimize.elykia.core.enumaration.AppNotificationType.CUSTOMER_ORDER)
                     AND UPPER(n.targetCollector) = UPPER(:username))
                 OR (n.type IN (com.optimize.elykia.core.enumaration.AppNotificationType.TONTINE_CATCHUP,
                                com.optimize.elykia.core.enumaration.AppNotificationType.TONTINE_PAYMENT_DECLARATION)
                     AND (
                          UPPER(n.tontineCollector) = UPPER(:username)
                          OR (n.tontineCollector IS NULL AND UPPER(n.targetCollector) = UPPER(:username))
                     ))
              )
              AND n.id NOT IN (
                  SELECT r.notificationId FROM AppNotificationRead r
                  WHERE UPPER(r.username) = UPPER(:username)
              )
            """)
    long countUnreadUnresolvedForPromoter(
            @Param("username") String username, @Param("state") State state);

    /**
     * Login toast scope: payment declarations (credit + tontine MM) and customer orders only.
     * Excludes {@code TONTINE_CATCHUP} rattrapages.
     */
    @Query("""
            SELECT COUNT(n) FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
              AND n.type IN (com.optimize.elykia.core.enumaration.AppNotificationType.PAYMENT_DECLARATION,
                             com.optimize.elykia.core.enumaration.AppNotificationType.CUSTOMER_ORDER,
                             com.optimize.elykia.core.enumaration.AppNotificationType.TONTINE_PAYMENT_DECLARATION)
              AND n.id NOT IN (
                  SELECT r.notificationId FROM AppNotificationRead r
                  WHERE UPPER(r.username) = UPPER(:username)
              )
            """)
    long countUnreadLoginToastForUser(@Param("username") String username, @Param("state") State state);

    @Query("""
            SELECT COUNT(n) FROM AppNotification n
            WHERE n.state = :state
              AND n.resolvedAt IS NULL
              AND (
                    (n.type IN (com.optimize.elykia.core.enumaration.AppNotificationType.PAYMENT_DECLARATION,
                                com.optimize.elykia.core.enumaration.AppNotificationType.CUSTOMER_ORDER)
                     AND UPPER(n.targetCollector) = UPPER(:username))
                 OR (n.type = com.optimize.elykia.core.enumaration.AppNotificationType.TONTINE_PAYMENT_DECLARATION
                     AND (
                          UPPER(n.tontineCollector) = UPPER(:username)
                          OR (n.tontineCollector IS NULL AND UPPER(n.targetCollector) = UPPER(:username))
                     ))
              )
              AND n.id NOT IN (
                  SELECT r.notificationId FROM AppNotificationRead r
                  WHERE UPPER(r.username) = UPPER(:username)
              )
            """)
    long countUnreadLoginToastForPromoter(
            @Param("username") String username, @Param("state") State state);
}
