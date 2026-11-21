package com.optimize.elykia.organization.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.organization.web.dto.AgencyDto;
import com.optimize.elykia.organization.domain.Agency;
import com.optimize.elykia.organization.web.mapper.AgencyMapper;
import com.optimize.elykia.organization.infrastructure.persistence.AgencyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AgencyService extends GenericService<Agency, Long> {
    private final AgencyMapper agencyMapper;

    protected AgencyService(AgencyRepository repository,
                            AgencyMapper agencyMapper) {
        super(repository);
        this.agencyMapper = agencyMapper;
    }

    @Transactional
    public Agency create(AgencyDto dto) {
        Agency agency = agencyMapper.toEntity(dto);
        return create(agency);
    }

    @Transactional
    public Agency update(Long id, AgencyDto dto) {
        dto.setId(id);
        Agency agency = agencyMapper.toEntity(dto);
        return update(agency);
    }
}
