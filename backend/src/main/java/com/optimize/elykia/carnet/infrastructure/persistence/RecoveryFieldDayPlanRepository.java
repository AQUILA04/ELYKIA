package com.optimize.elykia.carnet.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.carnet.domain.RecoveryFieldDayPlan;
import com.optimize.elykia.carnet.domain.FieldDayPlanStatus;

import java.time.LocalDate;
import java.util.Optional;

public interface RecoveryFieldDayPlanRepository extends GenericRepository<RecoveryFieldDayPlan, Long> {

    Optional<RecoveryFieldDayPlan> findByRecoveryManagerUsernameAndPlanDateAndStatus(
            String recoveryManagerUsername,
            LocalDate planDate,
            FieldDayPlanStatus status
    );

    Optional<RecoveryFieldDayPlan> findByIdAndRecoveryManagerUsername(Long id, String recoveryManagerUsername);
}
