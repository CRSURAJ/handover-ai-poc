import type { ScopeOfWorksResult } from "@/lib/sowTypes";

export type SowSubBlock = {
  subtitle?: string;
  description?: string;
  items: string[];
};

export type SowSectionData = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  subBlocks?: SowSubBlock[];
  notice?: boolean;
};

export function getSowSections(sow: ScopeOfWorksResult): SowSectionData[] {
  const f = sow.scopeFlags;
  const sections: SowSectionData[] = [];

  if (sow.overview) {
    sections.push({
      title: "Overview",
      paragraphs: sow.overview.split("\n\n").filter((p) => p.trim()),
    });
  }

  if (f.hasRemoval) {
    sections.push({
      title: "Decommissioning & Removal",
      paragraphs: [
        "The following existing plant and equipment will be decommissioned and removed from site:",
      ],
      items: sow.removalItems,
    });
  }

  if (f.hasSupply || f.installOnly) {
    sections.push({
      title: f.isPrefabSkid ? "Supply — Prefabricated Skid" : "Supply",
      subBlocks: sow.supplySections.map((sec) => ({
        subtitle: sec.subtitle,
        description: sec.description,
        items: sec.items,
      })),
    });
  }

  if (f.hasPreliminaryDrawings) {
    sections.push({
      title: "Preliminary Drawings",
      paragraphs: [
        "General Arrangement (GA) and skid drawings will be prepared and submitted for client approval prior to commencement of manufacture.",
      ],
    });
  }

  if (f.hasFat) {
    sections.push({
      title: "Factory Acceptance Testing (FAT)",
      paragraphs: [
        "Factory Acceptance Testing will be conducted at Automatic Heating's Epping facility prior to despatch. The client is invited to witness FAT. FAT does not include on-site commissioning.",
      ],
    });
  }

  if (f.hasSupply && !f.hasCommissioning && !f.installOnly) {
    sections.push({
      title: "Installation",
      paragraphs: ["Supply only — installation is not in scope for this job."],
      notice: true,
    });
  }

  if (f.hasCommissioning || f.installOnly) {
    sections.push({
      title: "Installation",
      paragraphs: sow.installDescription ? [sow.installDescription] : [],
      items: sow.installItems,
    });
  }

  if (f.hasElectrical) {
    sections.push({
      title: "Electrical Works",
      subBlocks: sow.electricalSections.map((sec) => ({
        subtitle: sec.subtitle,
        items: sec.items,
      })),
    });
  }

  if (f.hasAncillaries) {
    sections.push({
      title: "Mechanical Ancillaries",
      items: sow.ancillaryItems,
    });
  }

  if (f.hasCommissioning) {
    sections.push({
      title: "Commissioning",
      paragraphs: sow.commissioningDescription ? [sow.commissioningDescription] : [],
      items: sow.commissioningItems,
    });
  }

  if (f.hasProgramme) {
    sections.push({
      title: "Programme & Site Management",
      paragraphs: [
        "Works will be programmed to minimise disruption to site operations. A detailed programme will be agreed with the client prior to commencement.",
      ],
    });
  }

  if (f.hasDelivery && sow.deliveryNote) {
    sections.push({
      title: "Delivery",
      paragraphs: [sow.deliveryNote],
    });
  }

  sections.push({
    title: "Exclusions",
    paragraphs: [
      "The following items are specifically excluded from this Scope of Works:",
    ],
    items: sow.exclusions,
  });

  return sections;
}
