package com.optimize.elykia.core.service;

import com.optimize.elykia.core.service.accounting.AccountingDayService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SharedService {
    @Getter
    private final AccountingDayService accountingDayService;
}
