package com.optimize.elykia.core.dto;

import com.optimize.common.entities.exception.CustomValidationException;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AgencyDailyReportDto {
    private Long id;
    private Long agencyId;
    private Double collection = 0D;
    private Double spending = 0D;
    private Double balance = 0D;
    private String day;
    private LocalDate recoveryDate = LocalDate.now();
    private Long agencyWeeklyReportId;

    public void balanceControl() {
        if (balance != (collection - spending)) {
            throw new CustomValidationException("Le solde renseigner n'est pas valide par rapport au recouvrements et dépenses !");
        }
    }
}
