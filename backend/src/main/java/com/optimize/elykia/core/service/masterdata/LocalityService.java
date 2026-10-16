package com.optimize.elykia.core.service.masterdata;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.entity.Locality;
import com.optimize.elykia.core.mapper.LocalityMapper;
import com.optimize.elykia.core.repository.LocalityRepository;
import com.optimize.elykia.core.util.LocalityNames;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class LocalityService extends GenericService<Locality, Long> {
    private final LocalityMapper localityMapper;

    protected LocalityService(LocalityRepository repository,
                              LocalityMapper localityMapper) {
        super(repository);
        this.localityMapper = localityMapper;
    }

    /**
     * Retrouve une localité active par nom (casse ignorée) ou la crée.
     * Le nom canonique déjà enregistré est conservé en cas d'homonyme.
     */
    @Transactional
    public Locality findOrCreateByName(String rawName) {
        String name = LocalityNames.normalize(rawName);
        if (!StringUtils.hasText(name) || name.length() > LocalityNames.MAX_LENGTH || LocalityNames.isOtherLabel(name)) {
            throw new CustomValidationException("Indiquez le nom de la localité.");
        }
        return getRepository()
                .findFirstByNameIgnoreCaseAndStateNot(name, State.DELETED)
                .orElseGet(() -> createNewLocality(name));
    }

    private Locality createNewLocality(String name) {
        LocalityDto dto = new LocalityDto();
        dto.setName(name);
        try {
            return createLocality(dto);
        } catch (ApplicationException alreadyExists) {
            return getRepository()
                    .findFirstByNameIgnoreCaseAndStateNot(name, State.DELETED)
                    .orElseThrow(() -> alreadyExists);
        }
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
