package com.optimize.common.entities.util;

import org.springframework.util.StringUtils;
import com.optimize.common.entities.exception.CustomValidationException;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CustomValidator {

    public static final Pattern VALID_EMAIL_ADDRESS_REGEX =
            Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,6}$", Pattern.CASE_INSENSITIVE);

    private CustomValidator() {
        //Default Constructor
    }

    public static void validatePhoneNumber(String phoneNumber) {
        if (!StringUtils.hasText(phoneNumber)) {
            throw new CustomValidationException("le numéro de téléphone est obligatoire");
        }
        if(phoneNumber.length() != 8 && phoneNumber.length() != 11) {
            throw new CustomValidationException("la taille du numéro de téléphone doit être 8 (XX XX XX XX) ou 11 (228 XX XX XX XX) : "+phoneNumber);
        }
        List<String> phoneInitials = List.of("90", "91", "92", "93", "96", "97", "98", "99", "70", "79", "71");
        if(phoneNumber.length() == 8 && !phoneInitials.contains(phoneNumber.substring(0, 2))) {
            throw new CustomValidationException("Le numéro renseigné n'appartient à aucun opérateur mobile Togolais : "+ phoneNumber);
        }
        if(phoneNumber.length() == 11 && !phoneNumber.startsWith("228")) {
            throw new CustomValidationException("L'indicatif du numéro de téléphone n'est pas Togolais : "+phoneNumber);
        }
    }

    public static void validateEmail(String email) {
        if (!StringUtils.hasText(email)) {
            throw new CustomValidationException("Email non renseigné!");
        }
        Matcher matcher = VALID_EMAIL_ADDRESS_REGEX.matcher(email);
        if (!matcher.find()) {
            throw new CustomValidationException("Email invalid : " + email);
        }
    }
}
