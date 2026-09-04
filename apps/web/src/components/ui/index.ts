// Design System - barrel exports
// Only components actively used in the application are exported here.
// TailAdmin template leftovers have been removed (Sprint 1 P0.1).

// Core building blocks
export { default as Button } from "./button/Button";
export { Card, CardTitle, CardDescription } from "./card";
export { Modal } from "./modal";
export { default as PageHeader } from "./PageHeader";

// Status & data display
export { StatusBadge, type StatusType } from "./status-badge/StatusBadge";
export { KPICard } from "./kpi-card/KPICard";
export { StatusStepper } from "./status-stepper/StatusStepper";
