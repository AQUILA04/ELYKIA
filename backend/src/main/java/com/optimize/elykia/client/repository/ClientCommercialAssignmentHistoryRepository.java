package com.optimize.elykia.client.repository;

import com.optimize.elykia.client.api.PortfolioActivityType;
import com.optimize.elykia.client.entity.ClientCommercialAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClientCommercialAssignmentHistoryRepository extends JpaRepository<ClientCommercialAssignmentHistory, Long> {

    @Query("select h from ClientCommercialAssignmentHistory h where h.clientId = :clientId "
            + "and (:activityType is null or h.activityType = :activityType) "
            + "order by h.occurredAt desc, h.id desc")
    List<ClientCommercialAssignmentHistory> findByClient(@Param("clientId") Long clientId,
                                                         @Param("activityType") PortfolioActivityType activityType);
}
