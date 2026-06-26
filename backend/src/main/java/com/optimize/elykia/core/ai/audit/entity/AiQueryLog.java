package com.optimize.elykia.core.ai.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_query_log")
@Getter
@Setter
@NoArgsConstructor
public class AiQueryLog {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(length = 100)
    private String username;

    @Column(name = "conversation_id", columnDefinition = "uuid")
    private UUID conversationId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(length = 20)
    private String intent;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "sql_text", columnDefinition = "TEXT")
    private String sqlText;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "sources_hit")
    private Integer sourcesHit;

    @Column(name = "row_count")
    private Integer rowCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
