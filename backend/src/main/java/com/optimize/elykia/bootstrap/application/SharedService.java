package com.optimize.elykia.bootstrap.application;

import com.optimize.elykia.finance.application.AccountingDayService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SharedService {
    @Getter
    private final AccountingDayService accountingDayService;
}
