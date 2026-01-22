package com.optimize.common.securities.repository;

import com.optimize.common.securities.models.AccountPermission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountPermissionRepository extends JpaRepository<AccountPermission, Long> {
}
