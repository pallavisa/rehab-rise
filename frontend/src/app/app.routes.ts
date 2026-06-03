import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { MemberDashboardComponent } from './components/member/member-dashboard.component';
import { adminGuard, memberGuard } from './guards';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'coach', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'dashboard', component: MemberDashboardComponent, canActivate: [memberGuard] },
  { path: '**', redirectTo: '' },
];
