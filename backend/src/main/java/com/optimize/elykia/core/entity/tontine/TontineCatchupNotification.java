package com.optimize.elykia.core.entity.tontine;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "tontine_catchup_notification")
@Getter
@Setter
@NoArgsConstructor
public class TontineCatchupNotification extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commercial_username", nullable = false)
    private String commercialUsername;

    @Column(name = "operation_date", nullable = false)
    private LocalDate operationDate;

    @Column(name = "capture_date", nullable = false)
    private LocalDate captureDate;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "collection_id")
    private Long collectionId;

    @Column(name = "collection_reference")
    private String collectionReference;

    @Column(name = "client_name")
    private String clientName;
}
