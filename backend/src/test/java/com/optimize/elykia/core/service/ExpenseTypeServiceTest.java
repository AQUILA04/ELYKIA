package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.ExpenseTypeDto;
import com.optimize.elykia.core.entity.ExpenseType;
import com.optimize.elykia.core.mapper.ExpenseTypeMapper;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.service.expense.ExpenseTypeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseTypeServiceTest {

    @Mock
    private ExpenseTypeRepository expenseTypeRepository;

    @Mock
    private ExpenseTypeMapper expenseTypeMapper;

    @InjectMocks
    private ExpenseTypeService expenseTypeService;

    private ExpenseType expenseType;
    private ExpenseTypeDto expenseTypeDto;

    @BeforeEach
    void setUp() {
        expenseType = new ExpenseType();
        expenseType.setId(1L);
        expenseType.setName("Test Type");

        expenseTypeDto = new ExpenseTypeDto();
        expenseTypeDto.setId(1L);
        expenseTypeDto.setName("Test Type");
    }

    @Test
    void createArticleType_ShouldReturnCreatedExpenseTypeDto() {
        when(expenseTypeMapper.toEntity(any(ExpenseTypeDto.class))).thenReturn(expenseType);
        when(expenseTypeRepository.save(any(ExpenseType.class))).thenReturn(expenseType);
        when(expenseTypeMapper.toDto(any(ExpenseType.class))).thenReturn(expenseTypeDto);

        ExpenseTypeDto created = expenseTypeService.createArticleType(expenseTypeDto);

        assertThat(created).isNotNull();
        assertThat(created.getName()).isEqualTo(expenseTypeDto.getName());
        verify(expenseTypeRepository, times(1)).save(any(ExpenseType.class));
    }

    @Test
    void updateArticleType_ShouldReturnUpdatedExpenseTypeDto() {
        when(expenseTypeMapper.toEntity(any(ExpenseTypeDto.class))).thenReturn(expenseType);
        when(expenseTypeRepository.saveAndFlush(any(ExpenseType.class))).thenReturn(expenseType);
        when(expenseTypeMapper.toDto(any(ExpenseType.class))).thenReturn(expenseTypeDto);
        // GenericService update often does a findById or save. Assuming save logic from GenericService/Service implementation.
        // Actually GenericService update implementation usually fetches then saves or simply saves if ID is present. 
        // Based on our implementation: dto.setId(id), toEntity, update(entity). update calls repository.save().
        
        // Since we are mocking repository.save, this should cover it.
        // However, GenericService.update(T entity) often checks existence if it's strictly implemented, but GenericRepository/Service from common libs varies.
        // Assuming standard JPA behavior mock.

        ExpenseTypeDto updated = expenseTypeService.updateArticleType(expenseTypeDto, 1L);

        assertThat(updated).isNotNull();
        assertThat(updated.getId()).isEqualTo(1L);
        verify(expenseTypeRepository, times(1)).saveAndFlush(any(ExpenseType.class));
    }

    @Test
    void getByIdDto_ShouldReturnExpenseTypeDto() {
        when(expenseTypeRepository.findById(1L)).thenReturn(Optional.of(expenseType));
        when(expenseTypeMapper.toDto(any(ExpenseType.class))).thenReturn(expenseTypeDto);

        ExpenseTypeDto found = expenseTypeService.getByIdDto(1L);

        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo(1L);
    }

    @Test
    void getAllDto_Pageable_ShouldReturnPageOfExpenseTypeDto() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<ExpenseType> page = new PageImpl<>(Collections.singletonList(expenseType));
        
        when(expenseTypeRepository.findByState(eq(com.optimize.common.entities.enums.State.ENABLED), any(Pageable.class))).thenReturn(page);
        when(expenseTypeMapper.toDto(any(ExpenseType.class))).thenReturn(expenseTypeDto);

        Page<ExpenseTypeDto> result = expenseTypeService.getAllDto(pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Test Type");
    }
}
