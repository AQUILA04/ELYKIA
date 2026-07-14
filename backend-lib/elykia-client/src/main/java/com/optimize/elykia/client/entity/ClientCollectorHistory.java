package com.optimize.elykia.client.entity;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.client.enumeration.ClientCollectorType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "client_collector_history")
@Getter
@Setter
public class ClientCollectorHistory extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "collector_type", nullable = false)
    private ClientCollectorType collectorType;

    @Column(name = "old_collector")
    private String oldCollector;

    @Column(name = "new_collector", nullable = false)
    private String newCollector;

    @Column(name = "performed_by", nullable = false)
    private String performedBy;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;
}
