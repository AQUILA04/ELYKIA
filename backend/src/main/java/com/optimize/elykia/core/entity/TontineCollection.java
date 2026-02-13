package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class TontineCollection extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tontine_member_id", nullable = false)
    private TontineMember tontineMember;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private LocalDateTime collectionDate;

    @Column(nullable = false)
    private String commercialUsername;
    private Boolean isDeliveryCollection = Boolean.FALSE;

    @Column(unique = true)
    private String reference;
}
