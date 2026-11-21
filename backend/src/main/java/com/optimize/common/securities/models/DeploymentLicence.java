package com.optimize.common.securities.models;

import com.optimize.common.securities.payload.request.DeploymentRequest;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "deployment")
public class DeploymentLicence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String societyName;
    private String activationCode;
    private LocalDate issuedDate;
    private LocalDate renewDate;


    public static DeploymentLicence from(DeploymentRequest request) {
        DeploymentLicence deploymentLicence = new DeploymentLicence();
        deploymentLicence.setActivationCode(request.getActivationCode());
        deploymentLicence.setSocietyName(request.getSocietyName());
        deploymentLicence.setIssuedDate(LocalDate.now());
        return deploymentLicence;
    }

    public void renew(String activationCode) {
        this.activationCode = activationCode;
        this.renewDate = LocalDate.now();
    }
}
