package com.optimize.elykia.organization.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.organization.web.dto.PromoterDto;
import com.optimize.elykia.organization.domain.Promoter;
import com.optimize.elykia.organization.web.mapper.PromoterMapper;
import com.optimize.elykia.organization.infrastructure.persistence.PromoterRepository;
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
