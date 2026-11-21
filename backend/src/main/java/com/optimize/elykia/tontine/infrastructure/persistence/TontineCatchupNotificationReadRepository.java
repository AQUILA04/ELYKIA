package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.tontine.domain.TontineCatchupNotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface TontineCatchupNotificationReadRepository
        extends JpaRepository<TontineCatchupNotificationRead, TontineCatchupNotificationRead.Pk> {

    List<TontineCatchupNotificationRead> findByUsernameIgnoreCaseAndNotificationIdIn(
            String username, Collection<Long> notificationIds);

    boolean existsByNotificationIdAndUsernameIgnoreCase(Long notificationId, String username);
}
