package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.enumaration.DepositStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Objects;

@Entity
@Getter
@Setter
public class AgencyWeeklyDeposit extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    private AgencyWeeklyReport agencyWeeklyReport;
    private Double totalAmount;
    @Enumerated(EnumType.STRING)
    private DepositStatus depositStatus;
    private Double irregularityAmount;
    private Double balance;

    public void irregularityControl() {
        if ( (!DepositStatus.NORMAL.equals(this.depositStatus)) && (Objects.isNull(irregularityAmount) || irregularityAmount == 0D)) {
            throw new CustomValidationException("Veuillez  saisir le montant du "+ (DepositStatus.SURPLUS.equals(depositStatus) ? "surplus" : "manquant"));
        }
    }
}
