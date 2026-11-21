package com.optimize.common.entities.util;

public class ParameterConstant {

    private ParameterConstant() {
        //Default
    }

    public static final String SMIG = "setting.national.smig";
    public static final String NIU_OTP_SYSTEM = "setting.niu.otp.system";
    public static final String SCORING_SYSTEM = "setting.scoring.system";
    public static final String RSPM_SCORING_SERVICE_BASE_URL = "setting.rspm.scoring.service.base.url";
    public static final String CONSENT_TEXT_KEY = "setting.consent.text";
    public static final String CONSENT_TEXT_VALUE = """
            Les présents termes et conditions ont pour objet l’encadrement juridique lors de l’enrôlement dans le 
            Registre Social des Personnes et des Ménages (RSPM). Ces conditions doivent être acceptées par tout 
            utilisateur souhaitant s’enregistrer pour prendre part aux différents programmes sociaux.
            Les informations recueillies lors de cet enregistrement sont d’ordre démographiques, biométriques et 
            socio-économiques. Toutefois ces informations collectées seront strictement confidentielles conformément à
             la loi n°2011-014 du 03 juin 2011 régissant l’activité statistique au Togo qui stipule en son 
             article 8 «La divulgation des informations des membres, collectées dans le cadre des enquêtes et des 
             recensements ou extraites des fichiers administratifs à des fins statistiques, est formellement interdite,
              sauf autorisation explicite accordée par les personnes physiques ou morales concernées par ces informations. 
              Ces informations relèvent scrupuleusement du secret statistique ».
            En acceptant ces termes et conditions, vous nous autorisez à utiliser vos informations uniquement dans le cadre du RSPM.
            """;
    public static final String URBAN_RESIDENCE_SCORE_VALIDATION = "setting.urban.residence.score.auto.validation";

    public static final String SMS_KEY_CREATE_HOUSEHOLD = "setting.sms.key.create-household";
    public static final String SMS_VALUE_CREATE_HOUSEHOLD = "setting.sms.value.create-household";
    public static final String SMS_KEY_CHANGE_HOUSEHOLD_MANAGER = "setting.sms.key.change-household-manager";
    public static final String SMS_VALUE_CHANGE_HOUSEHOLD_MANAGER = "setting.sms.value.change-household-manager";
    public static final String SMS_KEY_SCORING_HOUSEHOLD = "setting.sms.key.scoring-household";
    public static final String SMS_VALUE_SCORING_HOUSEHOLD = "setting.sms.value.scoring-household";
    public static final String SMS_KEY_USER_ACCOUNT_CREATION_AUTO = "setting.sms.key.user-account-creation-auto";
    public static final String SMS_VALUE_USER_ACCOUNT_CREATION_AUTO = "setting.sms.value.user-account-creation-auto";
    public static final String SMS_KEY_USER_ACCOUNT_CREATION_MANUAL = "setting.sms.key.user-account-creation-manual";
    public static final String SMS_VALUE_USER_ACCOUNT_CREATION_MANUAL = "setting.sms.value.user-account-creation-manual";
    public static final String SMS_KEY_ADD_MEMBER_TO_HOUSEHOLD_NOTIF_MANAGER = "setting.sms.key.add-member.notif-manager";
    public static final String SMS_VALUE_ADD_MEMBER_TO_HOUSEHOLD_NOTIF_MANAGER = "setting.sms.value.add-member.notif-manager";
    public static final String SMS_KEY_ADD_MEMBER_TO_HOUSEHOLD_NOTIF_MEMBER = "setting.sms.key.add-member.notif-member";
    public static final String SMS_VALUE_ADD_MEMBER_TO_HOUSEHOLD_NOTIF_MEMBER = "setting.sms.value.add-member.notif-member";

    public static final String SMS_KEY_TRANSFER_PENDING_NOTIF_MEMBERS = "transfer.pending.inform.members.sms";
    public static final String SMS_KEY_TRANSFER_PENDING_NOTIF_MEMBERS_2 = "transfer.pending.inform.members.sms2";

    public static final String SMS_KEY_TRANSFER_PENDING_NOTIF_MANAGER = "transfer.pending.inform.head.sms";
    public static final String SMS_KEY_TRANSFER_PENDING_NOTIF_MANAGER_2 = "transfer.pending.inform.head.sms2";

    public static final String SMS_KEY_TRANSFER_VALIDATED_NOTIF_MEMBERS = "transfer.validated.inform.members.sms";

    public static final String SMS_KEY_TRANSFER_VALIDATED_NOTIF_MANAGER = "transfer.validated.inform.head.sms";

    public static final String SMS_KEY_TRANSFER_REJECTED_NOTIF_MEMBERS = "transfer.rejected.inform.members.sms";
    public static final String SMS_KEY_TRANSFER_REJECTED_NOTIF_MEMBERS2 = "transfer.rejected.inform.members.sms2";

    public static final String SMS_KEY_TRANSFER_REJECTED_NOTIF_MANAGER = "transfer.rejected.inform.head.sms";
    public static final String SMS_KEY_EXIT_RS = "exit.rs.request.sms";
    public static final String SMS_KEY_EXIT_RS_VALIDATED = "exit.rs.validated.sms";
    public static final String SMS_KEY_DEATH_DECLARATION = "death.declaration.sms";
    public static final String SMS_KEY_MEMBER_DEPARTURE_INFORM_MANAGER = "member.departure.inform.head.sms";
    public static final String SMS_KEY_MEMBER_DEPARTURE_INFORM_MEMBER = "member.departure.inform.member.sms";

    public static final String HOUSEHOLD_SUSPENDED_SMS_KEY = "household.suspended.sms.key";
    public static final String HOUSEHOLD_SUSPENDED_SMS_VALUE = "household.suspended.sms.value";
    public static final String HOUSEHOLD_SOCIAL_PROGRAM_STARTED_SMS_KEY = "household.social-program.start.sms.key";
    public static final String HOUSEHOLD_SOCIAL_PROGRAM_STARTED_SMS_VALUE = "household.social-program.start.sms.value";
    public static final String MEMBER_SOCIAL_PROGRAM_STARTED_SMS_KEY = "member.social-program.start.sms.key";
    public static final String MEMBER_SOCIAL_PROGRAM_STARTED_SMS_VALUE = "member.social-program.start.sms.value";
    public static final String HOUSEHOLD_SOCIAL_PROGRAM_ENDED_SMS_KEY = "household.social-program.ended.sms.key";
    public static final String HOUSEHOLD_SOCIAL_PROGRAM_ENDED_SMS_VALUE = "household.social-program.ended.sms.value";

    public static final String MEMBER_SOCIAL_PROGRAM_ENDED_SMS_KEY = "member.social-program.ended.sms.key";
    public static final String MEMBER_SOCIAL_PROGRAM_ENDED_SMS_VALUE = "member.social-program.ended.sms.value";

    public static final String REJECTED_DEATH_DECLARATION_SMS_KEY = "rejected.death.declaration.sms.key";
    public static final String REJECTED_DEATH_DECLARATION_SMS_VALUE = "rejected.death.declaration.sms.value";
    public static final String SMS_KEY_EXIT_RS_REJECTED = "exit.rs.rejected.sms.key";
    public static final String SMS_VALUE_EXIT_RS_REJECTED = "exit.rs.rejected.sms.value";
    public static final String PARTNER_ACCOUNT_VALIDATION_SMS_KEY = "partner.account.validation.sms.key";
    public static final String PARTNER_ACCOUNT_VALIDATION_SMS_VALUE = "partner.account.validation.sms.value";

    public static final String HOUSEHOLD_STATUS_FOR_SOCIAL_PROGRAM_KEY = "household.status.for.social.program.key";
    public static final String HOUSEHOLD_STATUS_FOR_SOCIAL_PROGRAM_VALUE = "household.status.for.social.program.value";

}
