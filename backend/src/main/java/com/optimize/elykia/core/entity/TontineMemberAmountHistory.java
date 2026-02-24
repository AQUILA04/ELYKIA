package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class TontineMemberAmountHistory extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tontine_member_id", nullable = false)
    @JsonBackReference
    private TontineMember tontineMember;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false)
    private LocalDateTime creationDate = LocalDateTime.now();
}
