package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_member_allocation_snapshot")
public class TontineMemberAllocationSnapshot extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "run_id", nullable = false)
    private TontineAllocationMigrationRun run;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private Long clientId;

    @Column(nullable = false)
    private Double societyShare = 0.0;

    @Column(nullable = false)
    private Double totalContribution = 0.0;

    @Column(nullable = false)
    private Double availableContribution = 0.0;

    @Column(nullable = false)
    private Integer validatedMonths = 0;

    @Column(nullable = false)
    private Integer currentMonthDays = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> collectionsSocietyShare = new ArrayList<>();
}
