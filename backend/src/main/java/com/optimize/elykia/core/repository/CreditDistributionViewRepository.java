package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.CreditDistributionView;
import com.optimize.elykia.core.entity.CreditDistributionViewId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditDistributionViewRepository extends JpaRepository<CreditDistributionView, CreditDistributionViewId> {

    @Query(value = "SELECT * FROM credit_distribution_view v WHERE v.credit_parent_id = :creditId", nativeQuery = true)
    List<CreditDistributionView> findByCreditParentId(Long creditId);
}
