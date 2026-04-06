package com.optimize.elykia.core.service.agency;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.AgencyDto;
import com.optimize.elykia.core.entity.agency.Agency;
import com.optimize.elykia.core.mapper.AgencyMapper;
import com.optimize.elykia.core.repository.AgencyRepository;
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
