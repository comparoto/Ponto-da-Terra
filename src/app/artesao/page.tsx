import { RoleGate, PortalShell } from '@/components/Portal';
import { ArtisanDashboard } from '@/components/RoleDashboards';
export default function ArtisanPage() { return <RoleGate role="artesao"><PortalShell title="Área do artesão" description="Gerencie suas peças, estoque e pedidos."><ArtisanDashboard/></PortalShell></RoleGate>; }
