package com.optimize.elykia.sale.application;

import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.BulkChangeCollectorDto;
import com.optimize.elykia.sale.web.dto.ChangeDailyStakeDto;
import com.optimize.elykia.sale.web.dto.CreditDto;
import com.optimize.elykia.sale.web.dto.CreditSearchDto;
import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditServiceFacadeTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CashSaleService cashSaleService;
    @Mock private CreditSaleService creditSaleService;
    @Mock private TontineSaleService tontineSaleService;
    @Mock private SaleCollectorService saleCollectorService;
    @Mock private SaleQueryService saleQueryService;

    private CreditService facade;

    @BeforeEach
    void setUp() {
        facade = new CreditService(
                creditRepository,
                cashSaleService,
                creditSaleService,
                tontineSaleService,
                saleCollectorService,
                saleQueryService);
    }

    @Test
    void routesCreateAndUpdateBySaleType() {
        CreditDto cashDto = new CreditDto();
        cashDto.setType(OperationType.CASH);
        facade.createCredit(cashDto);
        verify(cashSaleService).createCashSale(cashDto);

        CreditDto creditDto = new CreditDto();
        creditDto.setType(OperationType.CREDIT);
        facade.createCredit(creditDto);
        verify(creditSaleService).createCredit(creditDto);

        Credit existingCash = new Credit(1L);
        existingCash.setType(OperationType.CASH);
        when(creditRepository.findById(1L)).thenReturn(Optional.of(existingCash));
        facade.updateCredit(cashDto, 1L);
        verify(cashSaleService).updateCashSale(cashDto, 1L);

        Credit existingCredit = new Credit(2L);
        existingCredit.setType(OperationType.CREDIT);
        when(creditRepository.findById(2L)).thenReturn(Optional.of(existingCredit));
        facade.updateCredit(creditDto, 2L);
        verify(creditSaleService).updateCredit(creditDto, 2L);
    }

    @Test
    void delegatesSpecializedOperationsToCohesiveServices() {
        Pageable pageable = PageRequest.of(0, 10);

        facade.settleCashSaleOnDelivery(1L);
        verify(cashSaleService).settleCashSaleOnDelivery(1L);

        facade.cancelPendingCashSale(2L);
        verify(cashSaleService).cancelPendingCashSale(2L);

        facade.validateCredit(3L);
        verify(creditSaleService).validateCredit(3L);

        facade.startCredit(3L, false);
        verify(creditSaleService).startCredit(3L, false);

        ChangeDailyStakeDto stakeDto = new ChangeDailyStakeDto(3L, 500.0);
        facade.changeDailyStake(stakeDto);
        verify(creditSaleService).changeDailyStake(stakeDto);

        facade.deleteSoft(3L);
        verify(creditSaleService).deleteSoft(3L);

        Credit tontine = new Credit();
        facade.createTontineCredit(tontine, "9", null, null);
        verify(tontineSaleService).createTontineSale(tontine, "9", null, null);

        facade.changeCollector(4L, "COM002");
        verify(saleCollectorService).changeCollector(4L, "COM002");

        BulkChangeCollectorDto bulkDto = new BulkChangeCollectorDto();
        facade.bulkChangeCollector(bulkDto);
        verify(saleCollectorService).bulkChangeCollector(bulkDto);

        CreditSearchDto searchDto = new CreditSearchDto(null, null, null, null, null, null, null, null);
        facade.searchCredits(searchDto, pageable);
        verify(saleQueryService).searchCredits(searchDto, pageable);

        facade.getByIdWithSourceStocks(5L);
        verify(saleQueryService).getByIdWithSourceStocks(5L);
    }
}
