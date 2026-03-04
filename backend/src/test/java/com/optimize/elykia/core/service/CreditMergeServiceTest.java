package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.CreditSummaryDto;
import com.optimize.elykia.core.dto.MergeCreditDto;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import com.optimize.elykia.core.service.sale.CreditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditMergeServiceTest {

    @Mock
    private CreditRepository creditRepository;

    @Mock
    private CreditArticlesService creditArticlesService;

    @InjectMocks
    private CreditService creditService;

    private String commercialUsername;
    private List<Credit> mockCredits;

    @BeforeEach
    void setUp() {
        commercialUsername = "commercial123";
        
        // Création des crédits de test
        Credit credit1 = createMockCredit(1L, "P24123456", 100000.0, LocalDate.of(2024, 1, 15));
        Credit credit2 = createMockCredit(2L, "P24789012", 150000.0, LocalDate.of(2024, 1, 20));
        Credit credit3 = createMockCredit(3L, "P24345678", 200000.0, LocalDate.of(2024, 1, 10));
        
        mockCredits = Arrays.asList(credit1, credit2, credit3);
    }

    private Credit createMockCredit(Long id, String reference, Double totalAmount, LocalDate beginDate) {
        Credit credit = new Credit();
        credit.setId(id);
        credit.setReference(reference);
        credit.setTotalAmount(totalAmount);
        credit.setTotalAmountPaid(totalAmount * 0.1); // 10% payé
        credit.setTotalAmountRemaining(totalAmount * 0.9); // 90% restant
        credit.setBeginDate(beginDate);
        credit.setExpectedEndDate(beginDate.plusDays(30));
        credit.setAccountingDate(beginDate);
        credit.setReleaseDate(beginDate);
        credit.setCollector(commercialUsername);
        credit.setClientType(ClientType.PROMOTER);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setUpdatable(true);
        credit.setState(State.ENABLED);
        credit.setDailyStake(totalAmount / 30);
        credit.setAdvance(totalAmount * 0.1);
        
        // Client mock
        Client client = new Client();
        client.setId(1L);
        credit.setClient(client);
        
        return credit;
    }




}