package com.optimize.common.securities.repository;

import com.optimize.common.securities.models.ProfilPermission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfilPermissionRepository extends JpaRepository<ProfilPermission, Long> {

    boolean existsByUserProfil_nameAndUserPermission_name(String profilName, String permissionName);
}
