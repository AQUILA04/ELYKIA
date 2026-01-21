package com.optimize.common.securities.service;

import com.optimize.common.entities.util.DateUtils;
import com.optimize.common.securities.models.Licence;
import com.optimize.common.securities.repository.LicenceRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LicenceService {

    private final LicenceRepository licenceRepository;

    public boolean isValidLicence(String activationCode) {
        Licence licence = licenceRepository.findByActivationCode(activationCode);
        if (licence == null) return false;
        return licence.getExpirationDate().isAfter(LocalDate.now());
    }

    public void renewLicence(String activationCode) {
        Licence licence = licenceRepository.findByActivationCode(activationCode);
        if (licence != null && licence.isRenewable()) {
            Calendar calendar = Calendar.getInstance();
            calendar.setTime(new Date());
            if (licence.getActivationCode().startsWith("1Y")) {
                calendar.add(Calendar.YEAR, 1);
            } else if (licence.getActivationCode().startsWith("3Y")) {
                calendar.add(Calendar.YEAR, 3);
            }
            licence.setExpirationDate(DateUtils.convertToLocalDate(calendar.getTime()));
            licenceRepository.saveAndFlush(licence);
        }
    }

    public Licence createLicence(String activationCode) {
        Licence licence = new Licence();
        licence.setActivationCode(activationCode);
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(new Date());
        String activationDurationType = activationCode.substring(1, 2);
        String activationDurationPeriod = activationCode.substring(0, 1);
        switch (activationDurationType) {
            case "Y" -> {
                calendar.add(Calendar.YEAR, Integer.parseInt(activationDurationPeriod));
                licence.setRenewable(true);
            }
            case "M" -> {
                calendar.add(Calendar.MONTH, Integer.parseInt(activationDurationPeriod));
                licence.setRenewable(true);
            }
            case "D" -> {
                calendar.add(Calendar.DAY_OF_YEAR, Integer.parseInt(activationDurationPeriod));
                licence.setRenewable(true);
            }
            case "L" -> {
                calendar.add(Calendar.YEAR, 100); // Essentially unlimited

                licence.setRenewable(false);
            }
            default -> {
                calendar.add(Calendar.YEAR, 1);
                licence.setRenewable(true);
            }
        }
        licence.setExpirationDate(DateUtils.convertToLocalDate(calendar.getTime()));
        return licenceRepository.save(licence);
    }

    public List<Licence> initializeLicences(int numberOfLicences, String type, String passCode) {
        if ("425170760269839727".equals(passCode)) {
            List<Licence> licences = new ArrayList<>();
            for (int i = 0; i < numberOfLicences; i++) {
                String activationCode = generateActivationCode(type);
                Licence licence = createLicence(activationCode);
                licences.add(licence);
            }
            return licences;
        }
        return new ArrayList<>();
    }

    private String generateActivationCode(String type) {
        // Generate a unique activation code based on the type
        // For simplicity, we use a basic pattern here
        return type + RandomStringUtils.randomAlphanumeric(3).toUpperCase() + "-" + RandomStringUtils.randomAlphanumeric(5).toUpperCase() + "-" + RandomStringUtils.randomAlphanumeric(5).toUpperCase() + "-" + RandomStringUtils.randomAlphanumeric(5).toUpperCase() + "-" + RandomStringUtils.randomAlphanumeric(5).toUpperCase();
    }

    public boolean isExistsByCode(String code) {
        return licenceRepository.existsByActivationCode(code);
    }

    public void setUsed(String activationCode) {
        Licence licence = licenceRepository.findByActivationCode(activationCode);
        if (Objects.nonNull(licence)) {
            licence.setUsed(Boolean.TRUE);
            licenceRepository.saveAndFlush(licence);
        }
    }

    public LicenceRepository getRepository() {
        return licenceRepository;
    }

}
