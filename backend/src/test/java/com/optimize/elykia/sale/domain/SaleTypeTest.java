package com.optimize.elykia.sale.domain;

import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SaleTypeTest {

    @ParameterizedTest
    @EnumSource(SaleType.class)
    void roundTripsWithOperationType(SaleType saleType) {
        OperationType operationType = saleType.toOperationType();
        assertEquals(saleType, SaleType.fromOperationType(operationType));
        assertEquals(Optional.of(saleType), SaleType.fromOperationTypeOptional(operationType));
        assertEquals(saleType, SaleType.fromOperationTypeOrDefault(operationType, SaleType.CREDIT));
        assertTrue(SaleType.isSaleOperationType(operationType));
    }

    @Test
    void rejectsNullOrNonSaleOperationTypes() {
        assertThrows(IllegalArgumentException.class, () -> SaleType.fromOperationType(null));
        assertThrows(IllegalArgumentException.class, () -> SaleType.fromOperationType(OperationType.CASH_DEPOSIT));
        assertThrows(IllegalArgumentException.class, () -> SaleType.fromOperationType(OperationType.STOCK_RETURN));
        assertThrows(IllegalArgumentException.class, () -> SaleType.fromOperationType(OperationType.ADHESION_TOP_UP));

        assertEquals(Optional.empty(), SaleType.fromOperationTypeOptional(null));
        assertEquals(Optional.empty(), SaleType.fromOperationTypeOptional(OperationType.CASH_DEPOSIT));
        assertFalse(SaleType.isSaleOperationType(null));
        assertFalse(SaleType.isSaleOperationType(OperationType.CREDIT_COLLECTION));
        assertEquals(SaleType.CREDIT, SaleType.fromOperationTypeOrDefault(null, SaleType.CREDIT));
        assertEquals(SaleType.CASH, SaleType.fromOperationTypeOrDefault(OperationType.ORDER, SaleType.CASH));
    }

    @Test
    void creditHelpersReflectOperationType() {
        Credit credit = new Credit();
        assertNull(credit.getSaleType());
        assertFalse(credit.isCredit());
        assertFalse(credit.isCash());
        assertFalse(credit.isTontine());

        credit.setType(OperationType.CREDIT);
        assertEquals(SaleType.CREDIT, credit.getSaleType());
        assertTrue(credit.isCredit());
        assertFalse(credit.isCash());
        assertFalse(credit.isTontine());

        credit.setType(OperationType.CASH);
        assertEquals(SaleType.CASH, credit.getSaleType());
        assertTrue(credit.isCash());

        credit.setType(OperationType.TONTINE);
        assertEquals(SaleType.TONTINE, credit.getSaleType());
        assertTrue(credit.isTontine());
    }
}
