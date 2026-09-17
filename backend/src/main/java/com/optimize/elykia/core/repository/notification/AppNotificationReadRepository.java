package com.optimize.elykia.core.repository.notification;

import com.optimize.elykia.core.entity.notification.AppNotificationRead;
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
