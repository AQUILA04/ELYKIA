package com.optimize.elykia.core.service.expense;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.ExpenseTypeDto;
import com.optimize.elykia.core.entity.ExpenseType;
import com.optimize.elykia.core.mapper.ExpenseTypeMapper;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@Slf4j
public class ExpenseTypeService extends GenericService<ExpenseType, Long> {

    private final ExpenseTypeMapper expenseTypeMapper;

    public ExpenseTypeService(ExpenseTypeRepository repository, ExpenseTypeMapper expenseTypeMapper) {
        super(repository);
        this.expenseTypeMapper = expenseTypeMapper;
    }

    @Transactional
    public ExpenseTypeDto createArticleType(ExpenseTypeDto dto) {
        ExpenseType expenseType = expenseTypeMapper.toEntity(dto);
        expenseType = create(expenseType);
        return expenseTypeMapper.toDto(expenseType);
    }

    @Transactional
    public ExpenseTypeDto updateArticleType(ExpenseTypeDto dto, Long id) {
        dto.setId(id);
        ExpenseType expenseType = expenseTypeMapper.toEntity(dto);
        expenseType = update(expenseType);
        return expenseTypeMapper.toDto(expenseType);
    }
    
    // GenericService likely provides deleteSoft(id) if Auditable. ArticleTypeService called it.
    // If not, I'll keep my implementation or use delete(id) if hard delete. 
    // ArticleTypeController called deleteSoft.
    
    public ExpenseTypeDto getByIdDto(Long id) {
         return expenseTypeMapper.toDto(getById(id));
    }

    public Page<ExpenseTypeDto> getAllDto(Pageable pageable) {
        return getAll(pageable).map(expenseTypeMapper::toDto);
    }

    public List<ExpenseTypeDto> getAllDto() {
        return getAll().stream().map(expenseTypeMapper::toDto).collect(Collectors.toList());
    }
    
    @Override
    public ExpenseTypeRepository getRepository() {
        return (ExpenseTypeRepository) super.getRepository();
    }
}
