package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.entity.StockReception;
import com.optimize.elykia.core.mapper.StockReceptionMapper;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional(readOnly = true)
public class StockReceptionService extends GenericService<StockReception, Long> {

    private final StockReceptionMapper mapper;

    public StockReceptionService(StockReceptionRepository repository, StockReceptionMapper mapper) {
        super(repository);
        this.mapper = mapper;
    }

    public Page<StockReceptionDto> getAllReceptions(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Page<StockReception> page;
        if (startDate != null && endDate != null) {
            page = ((StockReceptionRepository) getRepository()).findByReceptionDateBetween(startDate, endDate, pageable);
        } else {
            page = getRepository().findAll(pageable);
        }
        // Utilise la méthode toDto par défaut qui ignore les items
        return page.map(mapper::toDto);
    }

    public StockReceptionDto getReceptionById(Long id) {
        StockReception reception = getById(id);
        // Utilise la méthode spécifique pour inclure les items
        return mapper.toDtoWithItems(reception);
    }
}
