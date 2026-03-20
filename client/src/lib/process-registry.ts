export interface ProcessEntry {
  id: string;
  title: string;
  path: string;
  defaultReturnTo: string;
  viewPath?: string;
  requiresDirtyGuard: boolean;
}

export const processRegistry: Record<string, ProcessEntry> = {
  "monthly-goal-flow": {
    id: "monthly-goal-flow",
    title: "Monthly Goal",
    path: "/monthly-goal",
    defaultReturnTo: "/dashboard",
    viewPath: "/plan",
    requiresDirtyGuard: false,
  },
  "eisenhower-wizard": {
    id: "eisenhower-wizard",
    title: "Plan Your Week",
    path: "/eisenhower",
    defaultReturnTo: "/plan",
    viewPath: "/eisenhower",
    requiresDirtyGuard: true,
  },
  "monthly-goal": {
    id: "monthly-goal",
    title: "Monthly Goal",
    path: "/monthly-goal",
    defaultReturnTo: "/plan",
    viewPath: "/plan",
    requiresDirtyGuard: false,
  },
  "habits": {
    id: "habits",
    title: "Habits",
    path: "/habits",
    defaultReturnTo: "/plan",
    viewPath: "/plan",
    requiresDirtyGuard: false,
  },
  "identity-doc": {
    id: "identity-doc",
    title: "Identity Document",
    path: "/identity",
    defaultReturnTo: "/dashboard",
    viewPath: "/dashboard",
    requiresDirtyGuard: false,
  },
  "journal-entry": {
    id: "journal-entry",
    title: "Journal Entry",
    path: "/journal",
    defaultReturnTo: "/dashboard",
    viewPath: "/journal",
    requiresDirtyGuard: false,
  },
};

export function getProcess(id: string): ProcessEntry | undefined {
  return processRegistry[id];
}

export function getProcessByPath(path: string): ProcessEntry | undefined {
  return Object.values(processRegistry).find((p) => p.path === path);
}
