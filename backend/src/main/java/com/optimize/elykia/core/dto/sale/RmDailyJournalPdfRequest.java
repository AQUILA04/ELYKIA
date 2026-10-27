package com.optimize.elykia.core.dto.sale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class RmDailyJournalPdfRequest {

    @NotBlank(message = "La journée du rapport est obligatoire.")
    @Size(max = 40)
    private String journalDate;

    @Valid
    @Size(max = 2000)
    private List<Operation> operations = new ArrayList<>();

    @Data
    public static class Operation {
        @Size(max = 80)
        private String operationType;
        @Size(max = 200)
        private String dossier;
        @Size(max = 20)
        private String time;
        @Size(max = 40)
        private String status;
        @Size(max = 500)
        private String detail;
    }
}
