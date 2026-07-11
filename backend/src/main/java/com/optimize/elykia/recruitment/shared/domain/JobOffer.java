package com.optimize.elykia.recruitment.shared.domain;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "job_offer")
@Getter
@Setter
@ToString
@NoArgsConstructor
public class JobOffer extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "TEXT")
    private List<String> highlights = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private JobOfferStatus status = JobOfferStatus.DRAFT;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @Column(name = "image_bucket", length = 128)
    private String imageBucket;

    @Column(name = "image_key", length = 512)
    private String imageKey;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;
}
