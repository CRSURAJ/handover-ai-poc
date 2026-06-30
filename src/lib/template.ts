export const TEMPLATE_NAME = "Advisory Project Critical Checklist";
export const TEMPLATE_REVISION = "2.0";

export const HEADER_FIELDS = [
  { fieldKey: "projectName", fieldLabel: "Project Name" },
  { fieldKey: "customer", fieldLabel: "Customer" },
  { fieldKey: "salesperson", fieldLabel: "Salesperson" },
  { fieldKey: "estimatedDeliveryDate", fieldLabel: "Est. Delivery Date" },
  { fieldKey: "projectType", fieldLabel: "Project Type" },
  { fieldKey: "paymentMethod", fieldLabel: "Payment Method" },
] as const;

export const CHECKLIST_ITEMS = [
  { category: "Project Planning", itemLabel: "Project Scope", critical: true },
  { category: "Project Planning", itemLabel: "Drawings (if available) – P&ID, GA & Skid", critical: false },
  { category: "Project Planning", itemLabel: "Itemised Quote", critical: true },
  { category: "Project Planning", itemLabel: "Design Schematic", critical: false },
  { category: "Project Planning", itemLabel: "Site visit (if applicable)", critical: false },
  { category: "Communications", itemLabel: "Send ALL email communications with customer", critical: true },
  { category: "Plant Area Info / Site Assessment", itemLabel: "Plant Location", critical: false },
  { category: "Plant Area Info / Site Assessment", itemLabel: "Plant Level", critical: false },
  { category: "Plant Area Info / Site Assessment", itemLabel: "Obstructions / Access Constraints", critical: true },
  { category: "Plant Area Info / Site Assessment", itemLabel: "Sufficient Power & Power Location (if known)", critical: true },
  { category: "Plant Area Info / Site Assessment", itemLabel: "Insulation & Cladding (R-rating & cladding type)", critical: false },
  { category: "Commissioning", itemLabel: "Commissioning is COMMSYS", critical: true },
] as const;
