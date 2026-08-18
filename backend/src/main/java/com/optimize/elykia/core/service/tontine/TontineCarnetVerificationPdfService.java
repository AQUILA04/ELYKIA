package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.CarnetVerificationExportPdfDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.Collator;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TontineCarnetVerificationPdfService {

    static final String TITLE_VERIFIED = "Carnets vérifiés";
    static final String TITLE_PENDING = "Carnets à vérifier";
    private static final DateTimeFormatter GENERATION_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TontineService tontineService;
    private final TontineMemberRepository tontineMemberRepository;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(readOnly = true)
    public byte[] export(boolean verified, String commercial) {
        TontineSession session = tontineService.getActiveSession();
        String commercialFilter = resolveCommercialFilter(commercial);
        List<TontineMember> members = tontineMemberRepository.findForCarnetVerificationExport(
                session.getYear(), verified, commercialFilter, State.ENABLED);

        CarnetVerificationExportPdfDto dto = buildDto(verified, commercialFilter, session.getYear(), members);

        String documentTitle = verified ? TITLE_VERIFIED : TITLE_PENDING;
        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, documentTitle);
        context.setVariable("doc", dto);
        String html = templateEngine.process("tontine-carnet-verification-export", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(documentTitle));
    }

    CarnetVerificationExportPdfDto buildDto(
            boolean verified,
            String commercialFilter,
            Integer sessionYear,
            List<TontineMember> members) {
        Collator collator = Collator.getInstance(Locale.FRENCH);
        collator.setStrength(Collator.PRIMARY);

        List<CarnetVerificationExportPdfDto.Row> rows = members.stream()
                .sorted(Comparator
                        .comparing((TontineMember member) -> lastname(member), collator)
                        .thenComparing(this::firstname, collator)
                        .thenComparing(TontineMember::getId, Comparator.nullsLast(Long::compareTo)))
                .map(this::toRow)
                .toList();

        List<CarnetVerificationExportPdfDto.Page> pages = CarnetVerificationColumnLayout.paginate(rows).stream()
                .map(columns -> CarnetVerificationExportPdfDto.Page.builder().columns(columns).build())
                .toList();

        String documentTitle = verified ? TITLE_VERIFIED : TITLE_PENDING;
        return CarnetVerificationExportPdfDto.builder()
                .title(documentTitle)
                .statusLabel(verified ? "Vérifiés" : "Non vérifiés")
                .commercialLabel(commercialFilter == null ? "Tous" : commercialFilter)
                .sessionYear(sessionYear)
                .generationDate(LocalDateTime.now().format(GENERATION_FORMAT))
                .memberCount(rows.size())
                .pages(pages)
                .build();
    }

    private String resolveCommercialFilter(String commercial) {
        User currentUser = tontineService.getUserService().getCurrentUser();
        if (currentUser != null && currentUser.is(UserProfilConstant.PROMOTER)) {
            return currentUser.getUsername();
        }
        if (!StringUtils.hasText(commercial) || "ALL".equalsIgnoreCase(commercial.trim())) {
            return null;
        }
        return commercial.trim();
    }

    private CarnetVerificationExportPdfDto.Row toRow(TontineMember member) {
        Client client = member.getClient();
        String last = lastname(member).toUpperCase(Locale.FRENCH);
        String first = firstname(member);
        String displayName = (last + " " + first).trim();
        if (!StringUtils.hasText(displayName)) {
            displayName = "Membre #" + member.getId();
        }
        String code = client != null && StringUtils.hasText(client.getCode()) ? client.getCode() : null;
        return CarnetVerificationExportPdfDto.Row.builder()
                .displayName(displayName)
                .clientCode(code)
                .build();
    }

    private String lastname(TontineMember member) {
        if (member.getClient() == null || member.getClient().getLastname() == null) {
            return "";
        }
        return member.getClient().getLastname();
    }

    private String firstname(TontineMember member) {
        if (member.getClient() == null || member.getClient().getFirstname() == null) {
            return "";
        }
        return member.getClient().getFirstname();
    }
}
