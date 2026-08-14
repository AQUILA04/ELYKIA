package com.optimize.common.securities.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.common.securities.event.ParameterUpdatedEvent;
import com.optimize.common.securities.models.Parameter;
import com.optimize.common.securities.repository.ParameterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ParameterService {

    private static final Set<String> SOCIETY_SHARE_VERSIONS = Set.of(
            TontineParameterConstant.SOCIETY_SHARE_VERSION_V1,
            TontineParameterConstant.SOCIETY_SHARE_VERSION_V2);

    private final ParameterRepository parameterRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Optional<Parameter> findByKey(String key) {
        return parameterRepository.findByKey(key);
    }

    public boolean isEnabled(String key) {
        Optional<Parameter> parameter = parameterRepository.findByKey(key);
        if (parameter.isPresent()) {
            String value = parameter.get().getValue();
            return Boolean.parseBoolean(value);
        }
        return false;
    }

    public String getValue(String key) {
        return parameterRepository.findByKey(key)
                .map(Parameter::getValue)
                .orElse(null);
    }

    public Parameter create(Parameter parameter) {
        if (parameter.getValue() != null) {
            normalizeAndValidate(parameter.getKey(), parameter.getValue());
            parameter.setValue(normalizeValue(parameter.getKey(), parameter.getValue()));
        }
        Parameter saved = parameterRepository.save(parameter);
        eventPublisher.publishEvent(new ParameterUpdatedEvent(this, saved.getKey(), null, saved.getValue()));
        return saved;
    }

    public Parameter update(Long id, String value, String description) {
        return parameterRepository.findById(id)
                .map(existingParameter -> {
                    String oldValue = existingParameter.getValue();
                    if (value != null) {
                        normalizeAndValidate(existingParameter.getKey(), value);
                        existingParameter.setValue(normalizeValue(existingParameter.getKey(), value));
                    }
                    if (description != null) {
                        existingParameter.setDescription(description);
                    }
                    Parameter saved = parameterRepository.save(existingParameter);
                    if (value != null && !Objects.equals(oldValue, saved.getValue())) {
                        eventPublisher.publishEvent(new ParameterUpdatedEvent(
                                this, saved.getKey(), oldValue, saved.getValue()));
                    }
                    return saved;
                })
                .orElseThrow(() -> new RuntimeException("Parameter not found with id " + id));
    }

    public void delete(Long id) {
        parameterRepository.deleteById(id);
    }

    public List<Parameter> findAll() {
        return parameterRepository.findAll();
    }

    public Page<Parameter> findAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return parameterRepository.findAll(pageable);
    }

    private void normalizeAndValidate(String key, String value) {
        if (!TontineParameterConstant.SOCIETY_SHARE_VERSION.equals(key) || value == null) {
            return;
        }
        String normalized = value.trim().toUpperCase();
        if (!SOCIETY_SHARE_VERSIONS.contains(normalized)) {
            throw new CustomValidationException(
                    "La valeur de TONTINE_SOCIETY_SHARE_VERSION doit être V1 ou V2.");
        }
    }

    private String normalizeValue(String key, String value) {
        if (TontineParameterConstant.SOCIETY_SHARE_VERSION.equals(key)) {
            return value.trim().toUpperCase();
        }
        return value;
    }
}
