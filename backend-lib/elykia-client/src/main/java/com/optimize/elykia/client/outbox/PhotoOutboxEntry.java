package com.optimize.elykia.client.outbox;

import com.optimize.elykia.client.enumeration.PhotoType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class PhotoOutboxEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clientId;

    @Enumerated(EnumType.STRING)
    private PhotoType photoType;

    private String localFilePath;

    @Enumerated(EnumType.STRING)
    private OutboxStatus status = OutboxStatus.PENDING;

    private int retryCount = 0;

    private LocalDateTime lastAttemptAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    private String errorMessage;
}
