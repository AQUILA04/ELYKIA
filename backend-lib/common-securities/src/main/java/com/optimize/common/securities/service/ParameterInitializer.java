package com.optimize.common.securities.service;

import com.optimize.common.securities.config.ParameterProperties;
import com.optimize.common.securities.models.Parameter;
import com.optimize.common.securities.repository.ParameterRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ParameterInitializer {

    private final ParameterRepository parameterRepository;
    private final ParameterProperties parameterProperties;

    @PostConstruct
    public void init() {
        if (parameterProperties.isInitEnabled()) {
            log.info("Initializing parameters...");
            for (ParameterProperties.ParameterData data : parameterProperties.getInitData()) {
                if (parameterRepository.findByKey(data.getKey()).isEmpty()) {
                    Parameter parameter = new Parameter();
                    parameter.setKey(data.getKey());
                    parameter.setValue(data.getValue());
                    parameter.setDescription(data.getDescription());
                    parameterRepository.save(parameter);
                    log.info("Parameter created: {}", data.getKey());
                } else {
                    log.debug("Parameter already exists: {}", data.getKey());
                }
            }
            log.info("Parameter initialization completed.");
        } else {
            log.info("Parameter initialization is disabled.");
        }
    }
}
