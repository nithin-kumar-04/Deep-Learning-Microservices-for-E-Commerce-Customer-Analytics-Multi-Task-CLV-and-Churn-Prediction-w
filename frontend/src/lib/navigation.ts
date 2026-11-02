import {
  FileText,
  Home,
  LayoutDashboard,
  Sparkles,
  Users,
  Package,
  Upload,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';

export type ViewId =
  | 'home'
  | 'overview'
  | 'simulator'
  | 'segments'
  | 'products'
  | 'reports'
  | 'batch'
  | 'at-risk';

export interface ViewMeta {
  id: ViewId;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'Analyse' | 'Operate';
}

export const VIEWS: ViewMeta[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Welcome to Velora and pick a workspace',
    icon: Home,
    group: 'Analyse',
  },
  {
    id: 'overview',
    label: 'Overview',
    description: 'Revenue, forecast and portfolio health',
    icon: LayoutDashboard,
    group: 'Analyse',
  },
  {
    id: 'simulator',
    label: 'Simulator',
    description: 'Score one customer and inspect the drivers',
    icon: Sparkles,
    group: 'Analyse',
  },
  {
    id: 'segments',
    label: 'Segments',
    description: 'RFM personas and segment performance',
    icon: Users,
    group: 'Analyse',
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Top sellers and revenue concentration',
    icon: Package,
    group: 'Analyse',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Export portfolio snapshots as CSV',
    icon: FileText,
    group: 'Analyse',
  },
  {
    id: 'at-risk',
    label: 'At-Risk',
    description: 'Priority accounts and churn exposure',
    icon: ShieldAlert,
    group: 'Operate',
  },
  {
    id: 'batch',
    label: 'Batch',
    description: 'Score a CSV of customers in one pass',
    icon: Upload,
    group: 'Operate',
  },
];

export const NAV_GROUPS: ViewMeta['group'][] = ['Analyse', 'Operate'];

const VIEW_IDS = new Set<string>(VIEWS.map((view) => view.id));

export function isViewId(value: string): value is ViewId {
  return VIEW_IDS.has(value);
}

export function getViewMeta(id: ViewId): ViewMeta {
  return VIEWS.find((view) => view.id === id) ?? VIEWS[0];
}
