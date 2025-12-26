package com.optimize.elykia.core.repository.view;

import com.optimize.elykia.core.entity.view.AccountancyReportView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public interface AccountancyReportRepository extends JpaRepository<AccountancyReportView, Long> {

    @Query(value = "SELECT * from accountancy_report_view where accounting_date >= cast(:dateFrom as date) AND accounting_date <= cast(:dateTo as date)", nativeQuery = true)
    List<AccountancyReportView> findByAccountingDateGreaterThanEqualAndAccountingDateLessThanEqual(LocalDate dateFrom, LocalDate dateTo);

    default Map<String, AccountancyReportView> sumByPeriod(LocalDate dateFrom, LocalDate dateTo) {
        return findByAccountingDateGreaterThanEqualAndAccountingDateLessThanEqual(dateFrom, dateTo).stream()
                .collect(Collectors.toMap(AccountancyReportView::getCollector, Function.identity(), (r1, r2) -> new AccountancyReportView(
                        r1.getCollector(),
                        r1.getCollectorFirstname(),  // Keep firstname from first object
                        r1.getCollectorLastname(),// Keep lastname from first object
                        dateFrom,
                        dateTo,
                        r1.getSystemBalance() + r2.getSystemBalance(),
                        r1.getRealBalance() + r2.getRealBalance()
                )));
    }
}
