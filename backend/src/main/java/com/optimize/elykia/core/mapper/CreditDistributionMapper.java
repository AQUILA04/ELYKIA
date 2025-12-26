package com.optimize.elykia.core.mapper;

import com.optimize.elykia.core.dto.CreditDistributionDto;
import com.optimize.elykia.core.entity.CreditDistributionView;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;

@Mapper(componentModel = "spring")
public interface CreditDistributionMapper {

    @Mappings({
        @Mapping(source = "id.creditParentId", target = "creditParentId"),
        @Mapping(source = "id.articleId", target = "articleId")
    })
    CreditDistributionDto toDto(CreditDistributionView entity);
}
