package com.optimize.common.securities.service;

import com.optimize.common.securities.exception.InvalidLicenceException;
import com.optimize.common.securities.models.DeploymentLicence;
import com.optimize.common.securities.models.Licence;
import com.optimize.common.securities.payload.request.DeploymentRequest;
import com.optimize.common.securities.repository.DeploymentLicenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class DeploymentLicenceService {
    private final DeploymentLicenceRepository deploymentLicenceRepository;
    private final LicenceService licenceService;

    @Value(value = "${spring.profiles.active}")
    private String activeProfile;

    @Value(value = "${security.licence.prod.active}")
    private Integer prodLicence;

    @Value(value = "${security.licence.prod.society}")
    private String licenceSociety;

    @Transactional
    public String deploy(DeploymentRequest request) {
        if(deploymentLicenceRepository.count() < 1 ) {
            deploymentLicenceRepository.save(DeploymentLicence.from(request));
            licenceService.renewLicence(request.getActivationCode());
            licenceService.setUsed(request.getActivationCode());
        }

        return "success:true";
    }

    @Transactional
    public Map<String, Boolean> renew(String activationCode) {
        if (!licenceService.isExistsByCode(activationCode)) {
            log.error("====> INVALID LICENSE: {} NOT EXIST", activationCode);
            throw new InvalidLicenceException("Licence invalide");
        }
        Licence licence = licenceService.getRepository().findByActivationCode(activationCode);

        if (Objects.nonNull(licence) && licence.isUsed()) {
            log.error("====> INVALID LICENSE: NULL al ALREADY USED");
            throw new InvalidLicenceException("Licence déjà utilisée !");
        }
        Map<String, Boolean> result = new java.util.HashMap<>(Map.of("success", Boolean.TRUE));
        DeploymentLicence deploymentLicence = deploymentLicenceRepository.findAll().stream().findFirst().orElse(null);
        if(Objects.nonNull(deploymentLicence)) {
            deploymentLicence.renew(activationCode);
            deploymentLicenceRepository.saveAndFlush(deploymentLicence);
            licenceService.renewLicence(activationCode);
            licenceService.setUsed(activationCode);
            return result;
        }
        result.put("success", Boolean.FALSE);
        return result;
    }

    @Transactional
    public void initDeploy() {
        if (Objects.isNull(getLicence())) {
            List<Licence> licences = new ArrayList<>();
            if (activeProfile.contains("dev") || activeProfile.contains("local") || activeProfile.contains("francis")  || activeProfile.contains("jeff")) { //|| activeProfile.contains("francis")
                licences = licenceService.initializeLicences(1, "IL", "425170760269839727");
            } else if (activeProfile.contains("recette") || activeProfile.contains("preprod") || activeProfile.contains("test") || activeProfile.contains("formation" )
                    || activeProfile.contains("uat") || activeProfile.contains("poc")) {
                licences = licenceService.initializeLicences(1, "6M", "425170760269839727");
            } else {
                prodLicence = Objects.nonNull(prodLicence) && !prodLicence.equals(0) ? prodLicence : 1;
                licences = licenceService.initializeLicences(1, prodLicence +"Y", "425170760269839727");
            }
            licences.stream().findFirst().ifPresent(licence -> {
                DeploymentRequest request = new DeploymentRequest();
                request.setActivationCode(licence.getActivationCode());
                request.setSocietyName(licenceSociety);
                deploy(request);
            });
        }
    }

    public DeploymentLicence getLicence() {
        return deploymentLicenceRepository.findAll().stream().findFirst().orElse(null);
    }
}
