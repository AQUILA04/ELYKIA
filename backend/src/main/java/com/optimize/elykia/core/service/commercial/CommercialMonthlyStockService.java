package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
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
