package com.optimize.common.securities.repository;

import com.optimize.common.securities.models.Licence;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LicenceRepository extends JpaRepository<Licence, Long> {
    Licence findByActivationCode(String activationCode);

    boolean existsByActivationCode(String activationCode);
}
