package com.optimize.common.securities.service;

import com.optimize.common.securities.models.Parameter;
import com.optimize.common.securities.repository.ParameterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ParameterService {

    private final ParameterRepository parameterRepository;

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

    public Parameter create(Parameter parameter) {
        return parameterRepository.save(parameter);
    }

    public Parameter update(Long id, String value, String description) {
        return parameterRepository.findById(id)
                .map(existingParameter -> {
                    if (value != null) {
                        existingParameter.setValue(value);
                    }
                    if (description != null) {
                        existingParameter.setDescription(description);
                    }
                    return parameterRepository.save(existingParameter);
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
}
