import { Routes } from '@angular/router';
import { authGuard } from './shared/helpers/guards/auth-guard';
import { Roles } from './shared/models/roles';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full'},
    { path: 'home',
        canActivate: [authGuard], data: {roles: [Roles.Admin, Roles.Medico, Roles.Paciente]},  //Todos los roles
        loadComponent: () => import('./components/home/home')
        .then(m => m.Home)
    },
    { path: 'login',
        loadComponent: () => import('./components/login/login')
        .then(m => m.Login)
    },
    { path: 'medico',
        canActivate: [authGuard], data: {roles: [Roles.Admin, Roles.Medico]},  //Solo admin y medico
        loadComponent: () => import('./components/medico-component/medico-component')
        .then(m => m.MedicoComponent)
    }
];
