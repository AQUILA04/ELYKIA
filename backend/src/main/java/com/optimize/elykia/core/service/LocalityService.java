package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.Locality;
import com.optimize.elykia.core.mapper.LocalityMapper;
import com.optimize.elykia.core.repository.LocalityRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class LocalityService extends GenericService<Locality, Long> {
    private final LocalityMapper localityMapper;

    protected LocalityService(LocalityRepository repository,
                              LocalityMapper localityMapper) {
        super(repository);
        this.localityMapper = localityMapper;
    }

    @Transactional
    public Locality createLocality(LocalityDto dto) {
        Locality locality = localityMapper.toEntity(dto);
        if (getRepository().existsByName(dto.getName())) {
            throw new ApplicationException("La localité \"" + dto.getName() + "\" existe déjà");
        }
        return create(locality);
    }

    @Transactional
    public Locality updateLocality(LocalityDto dto, Long id) {
        dto.setId(id);
        Locality locality = localityMapper.toEntity(dto);
        return update(locality);
    }

    public Page<Locality> elasticsearch(String keyword, Pageable pageable) {
        return getRepository().elasticsearch(keyword, pageable);
    }

    @Override
    public LocalityRepository getRepository() {
        return (LocalityRepository) super.getRepository();
    }


}
