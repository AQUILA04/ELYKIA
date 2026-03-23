package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.CreditPaymentEvent;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CreditPaymentEventRepository extends GenericRepository<CreditPaymentEvent, Long> {
    
    List<CreditPaymentEvent> findByCreditIdOrderByPaymentDateDesc(Long creditId);
    
    List<CreditPaymentEvent> findByPaymentDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT COUNT(e) FROM CreditPaymentEvent e WHERE e.credit.id = :creditId AND e.isOnTime = true")
    Long countOnTimePaymentsByCreditId(@Param("creditId") Long creditId);
    
    @Query("SELECT AVG(e.daysFromLastPayment) FROM CreditPaymentEvent e WHERE e.credit.id = :creditId")
    Double getAveragePaymentIntervalByCreditId(@Param("creditId") Long creditId);
}
