export type ScopeFlags = {
  hasRemoval: boolean;
  hasSupply: boolean;
  isPrefabSkid: boolean;
  installOnly: boolean;
  hasElectrical: boolean;
  hasAncillaries: boolean;
  hasFat: boolean;
  hasPreliminaryDrawings: boolean;
  hasCommissioning: boolean;
  hasProgramme: boolean;
  hasDelivery: boolean;
};

export type SowSupplySection = {
  subtitle: string;
  description: string;
  items: string[];
};

export type SowElectricalSection = {
  subtitle: string;
  items: string[];
};

export type ScopeOfWorksResult = {
  projectName: string;
  client: string;
  worksDescription: string;
  siteAddress: string;
  quoteReference: string;
  poNumber: string;
  scopeFlags: ScopeFlags;
  overview: string;
  removalItems: string[];
  supplySections: SowSupplySection[];
  installDescription: string;
  installItems: string[];
  electricalSections: SowElectricalSection[];
  ancillaryItems: string[];
  commissioningDescription: string;
  commissioningItems: string[];
  exclusions: string[];
  deliveryNote: string;
  footerNote: string;
};
