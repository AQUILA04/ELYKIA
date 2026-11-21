package com.optimize.elykia.organization.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.organization.web.dto.CommercialStaffDto;
import com.optimize.elykia.organization.web.dto.CommercialStaffWriteDto;
import com.optimize.elykia.organization.domain.Promoter;
import com.optimize.elykia.organization.infrastructure.persistence.CommercialAccountAssignmentRepository;
import com.optimize.elykia.organization.infrastructure.persistence.PromoterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommercialStaffService {

    private final PromoterRepository promoterRepository;
    private final CommercialAccountAssignmentRepository assignmentRepository;
    private final CommercialStaffPhotoService photoService;

    public List<CommercialStaffDto> list() {
        return promoterRepository.findByState(State.ENABLED).stream()
                .sorted(Comparator.comparing(person -> blank(person.getName()), String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();
    }

    public CommercialStaffDto get(Long id) {
        return toDto(require(id));
    }

    public CommercialStaffDto toDto(Promoter person) {
        String name = blank(person.getName());
        return new CommercialStaffDto(
                person.getId(),
                name,
                blankToNull(person.getPhoneNumber()),
                blankToNull(person.getSerialNumber()),
                person.getDateOfBirth(),
                photoService.presign(person.getPhotoObjectKey()),
                initials(name));
    }

    @Transactional
    public CommercialStaffDto create(CommercialStaffWriteDto dto) {
        Promoter person = new Promoter();
        apply(person, dto);
        return toDto(promoterRepository.save(person));
    }

    @Transactional
    public CommercialStaffDto update(Long id, CommercialStaffWriteDto dto) {
        Promoter person = require(id);
        apply(person, dto);
        return toDto(promoterRepository.save(person));
    }

    @Transactional
    public void delete(Long id) {
        Promoter person = require(id);
        if (assignmentRepository.existsByPromoterIdAndState(id, State.ENABLED)) {
            throw new CustomValidationException(
                    "Cette personne a déjà utilisé un compte commercial. L'historique est conservé.");
        }
        photoService.delete(id);
        person.setState(State.DELETED);
        promoterRepository.save(person);
    }

    Promoter require(Long id) {
        return promoterRepository.findById(id)
                .filter(person -> !person.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    private void apply(Promoter person, CommercialStaffWriteDto dto) {
        String name = dto == null ? null : blankToNull(dto.name());
        if (name == null) {
            throw new CustomValidationException("Le nom est obligatoire.");
        }
        if (name.length() > 255) {
            throw new CustomValidationException("Le nom est trop long.");
        }
        person.setName(name);
        person.setPhoneNumber(limited(dto.phoneNumber(), 255, "Le téléphone est trop long."));
        person.setSerialNumber(limited(dto.serialNumber(), 255, "La pièce d'identité est trop longue."));
        person.setDateOfBirth(dto.dateOfBirth());
    }

    private static String limited(String value, int max, String message) {
        String cleaned = blankToNull(value);
        if (cleaned != null && cleaned.length() > max) {
            throw new CustomValidationException(message);
        }
        return cleaned;
    }

    static String initials(String name) {
        if (!StringUtils.hasText(name)) {
            return "?";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            String word = parts[0];
            return word.substring(0, Math.min(2, word.length())).toUpperCase(Locale.FRENCH);
        }
        return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase(Locale.FRENCH);
    }

    private static String blank(String value) {
        return value == null ? "" : value.trim();
    }

    private static String blankToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
