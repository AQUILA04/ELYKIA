package com.optimize.elykia.notification.infrastructure.persistence;

import com.optimize.elykia.notification.domain.AppNotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AppNotificationReadRepository
        extends JpaRepository<AppNotificationRead, AppNotificationRead.Pk> {

    List<AppNotificationRead> findByUsernameIgnoreCaseAndNotificationIdIn(
            String username, Collection<Long> notificationIds);

    boolean existsByNotificationIdAndUsernameIgnoreCase(Long notificationId, String username);
}
