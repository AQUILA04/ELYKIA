package com.optimize.elykia.core.entity.tontine;

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
public class TontineMemberAmountHistoryArchive extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tontine_member_id", nullable = false)
    @JsonBackReference
    private TontineMember tontineMember;

    @Column(name = "batch_id", nullable = false, length = 64)
    private String batchId;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "original_creation_date")
    private LocalDateTime originalCreationDate;

    @Column(name = "archived_at", nullable = false)
    private LocalDateTime archivedAt = LocalDateTime.now();

    @Column(name = "archived_by", nullable = false, length = 100)
    private String archivedBy;

    @Column(name = "new_amount", nullable = false)
    private Double newAmount;
}
