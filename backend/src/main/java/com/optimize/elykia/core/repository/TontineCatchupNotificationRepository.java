package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.entity.tontine.TontineCatchupNotification;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TontineCatchupNotificationRepository
        extends BaseRepository<TontineCatchupNotification, Long, Long> {

    Optional<TontineCatchupNotification> findByCollectionId(Long collectionId);

    @Query("""
            SELECT n FROM TontineCatchupNotification n
            WHERE n.state = :state
            ORDER BY n.operationDate DESC, n.captureDate DESC, n.id DESC
            """)
    List<TontineCatchupNotification> findAllEnabled(@Param("state") State state);

    @Query("""
            SELECT COUNT(n) FROM TontineCatchupNotification n
            WHERE n.state = :state
              AND n.id NOT IN (
                  SELECT r.notificationId FROM TontineCatchupNotificationRead r
                  WHERE UPPER(r.username) = UPPER(:username)
              )
            """)
    long countUnreadForUser(@Param("username") String username, @Param("state") State state);
}
