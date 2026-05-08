package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.util.MonthEndCalculator;
import com.optimize.elykia.core.enumaration.StockStatus;
import com.optimize.common.exceptions.CustomValidationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class CommercialMonthlyStockService extends GenericService<CommercialMonthlyStock, Long> {

    private final UserService userService;

    protected CommercialMonthlyStockService(CommercialMonthlyStockRepository repository, UserService userService) {
        super(repository);
        this.userService = userService;
    }

    public long getDaysUntilMonthEnd() {
        return MonthEndCalculator.getDaysUntilMonthEnd();
    }

    @Transactional
    public void closeCurrentMonthStock(String collector) {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        CommercialMonthlyStock currentStock = ((CommercialMonthlyStockRepository) repository)
                .findByCollectorAndMonthAndYear(collector, month, year)
                .orElseThrow(() -> new CustomValidationException(
                        "Stock courant introuvable pour le commercial " + collector));

        if (currentStock.getStatus() == StockStatus.CLOSED) {
            throw new CustomValidationException(
                    "Le stock de ce mois est déjà clôturé.");
        }

        currentStock.setStatus(StockStatus.CLOSED);
        repository.save(currentStock);
    }

    public Page<CommercialMonthlyStock> getAll(String collector, Pageable pageable, Boolean historic) {
        LocalDate now = LocalDate.now();
        User currentUser = userService.getCurrentUser();
        if (Objects.nonNull(historic) && historic) {
            if (collector != null) {
                return ((CommercialMonthlyStockRepository) repository).findByCollectorAndMonthNotAndYearNotOrderByIdDesc(collector, now.getMonthValue(), now.getYear(), pageable);
            }

            if (currentUser.is(UserProfilConstant.PROMOTER)) {
                return ((CommercialMonthlyStockRepository) repository).findByCollectorAndMonthNotAndYearNotOrderByIdDesc(currentUser.getUsername(), now.getMonthValue(), now.getYear(), pageable);
            }
            return ((CommercialMonthlyStockRepository) repository).findByMonthNotAndYearNotOrderByIdDesc(now.getMonthValue(), now.getYear(), pageable);
        } else {
            if (collector != null) {
                return ((CommercialMonthlyStockRepository) repository).findByCollectorAndMonthAndYearOrderByIdDesc(collector, now.getMonthValue(), now.getYear(), pageable);
            }

            if (currentUser.is(UserProfilConstant.PROMOTER)) {
                return ((CommercialMonthlyStockRepository) repository).findByCollectorAndMonthAndYearOrderByIdDesc(currentUser.getUsername(), now.getMonthValue(), now.getYear(), pageable);
            }
            return ((CommercialMonthlyStockRepository) repository).findByMonthAndYearOrderByIdDesc(now.getMonthValue(), now.getYear(), pageable);
        }


    }
}
