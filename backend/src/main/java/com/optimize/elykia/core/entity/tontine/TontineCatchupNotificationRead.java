package com.optimize.elykia.core.entity.tontine;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "tontine_catchup_notification_read")
@Getter
@Setter
@NoArgsConstructor
@IdClass(TontineCatchupNotificationRead.Pk.class)
public class TontineCatchupNotificationRead {

    @Id
    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    @Id
    @Column(nullable = false)
    private String username;

    @Column(name = "read_at", nullable = false)
    private LocalDateTime readAt = LocalDateTime.now();

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Pk implements Serializable {
        private Long notificationId;
        private String username;

        public Pk(Long notificationId, String username) {
            this.notificationId = notificationId;
            this.username = username;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Pk pk)) {
                return false;
            }
            return Objects.equals(notificationId, pk.notificationId)
                    && Objects.equals(username, pk.username);
        }

        @Override
        public int hashCode() {
            return Objects.hash(notificationId, username);
        }
    }
}
