package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.PromoterDto;
import com.optimize.elykia.core.entity.Promoter;
import com.optimize.elykia.core.mapper.PromoterMapper;
import com.optimize.elykia.core.repository.PromoterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PromoterService extends GenericService<Promoter, Long> {
    private final PromoterMapper promoterMapper;

    protected PromoterService(PromoterRepository repository, PromoterMapper promoterMapper) {
        super(repository);
        this.promoterMapper = promoterMapper;
    }

    @Transactional
    public Promoter createPromoter(PromoterDto dto) {
        Promoter promoter = promoterMapper.toEntity(dto);
        return create(promoter);
    }

    @Transactional
    public Promoter updatePromoter(PromoterDto dto, Long id) {
        dto.setId(id);
        Promoter promoter = promoterMapper.toEntity(dto);
        return update(promoter);
    }


}
