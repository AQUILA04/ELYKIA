export interface CommercialMobileMoneyConfigRow {
  commercialUsername: string;
  commercialFullName: string;
  commercialPhone: string;
  mixxNumber?: string | null;
  moovNumber?: string | null;
  effectiveMixxNumber?: string | null;
  effectiveMoovNumber?: string | null;
  mixxUsesGlobalDefault: boolean;
  moovUsesGlobalDefault: boolean;
}

export interface CommercialMobileMoneyConfigPage {
  globalMixxNumber?: string | null;
  globalMoovNumber?: string | null;
  commercials: CommercialMobileMoneyConfigRow[];
}

export interface CommercialMobileMoneyConfigUpsert {
  mixxNumber?: string | null;
  moovNumber?: string | null;
}
