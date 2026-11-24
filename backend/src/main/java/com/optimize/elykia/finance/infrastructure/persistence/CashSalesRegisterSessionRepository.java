package com.optimize.elykia.finance.infrastructure.persistence;

import com.optimize.elykia.finance.domain.CashSalesRegisterSession;
import com.optimize.elykia.finance.domain.CashSalesRegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CashSalesRegisterSessionRepository extends JpaRepository<CashSalesRegisterSession, Long> {

    Optional<CashSalesRegisterSession> findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus status);

    List<CashSalesRegisterSession> findBySessionDateBetweenOrderBySessionDateDescOpenedAtDesc(
            LocalDate startDate, LocalDate endDate);
}
