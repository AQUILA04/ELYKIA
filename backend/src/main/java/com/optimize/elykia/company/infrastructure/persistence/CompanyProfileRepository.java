package com.optimize.elykia.company.infrastructure.persistence;

import com.optimize.elykia.company.domain.CompanyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyProfileRepository extends JpaRepository<CompanyProfile, Long> {
}
