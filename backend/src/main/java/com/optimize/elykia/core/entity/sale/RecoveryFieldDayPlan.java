package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.FieldDayPlanStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "recovery_field_day_plan")
@Getter
@Setter
@NoArgsConstructor
public class RecoveryFieldDayPlan extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recovery_manager_username", nullable = false)
    private String recoveryManagerUsername;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private FieldDayPlanStatus status;

    /** JSON array of commercial usernames (1–3). */
    @Column(name = "commercial_usernames_json", nullable = false, columnDefinition = "TEXT")
    private String commercialUsernamesJson;

    /** JSON array of Client.quarter names; null/empty = all quarters. */
    @Column(name = "quarters_json", columnDefinition = "TEXT")
    private String quartersJson;
}
