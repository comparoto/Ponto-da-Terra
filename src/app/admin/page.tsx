import { RoleGate, PortalShell } from '@/components/Portal';
import { AdminDashboard } from '@/components/RoleDashboards';
export default function AdminPage() { return <RoleGate role="administrador"><PortalShell title="Painel administrativo" description="Visão geral e gerenciamento da plataforma."><AdminDashboard/></PortalShell></RoleGate>; }
