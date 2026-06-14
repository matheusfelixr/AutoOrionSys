import { Routes } from '@angular/router';
import { authGuard }   from './core/guards/auth.guard';
import { screenGuard } from './core/guards/screen.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'veiculos',
        canActivate: [screenGuard('veiculos')],
        loadComponent: () =>
          import('./features/veiculos/veiculos-list.component').then(m => m.VeiculosListComponent),
      },
      {
        path: 'marcas',
        canActivate: [screenGuard('marcas')],
        loadComponent: () =>
          import('./features/marcas/marcas-list.component').then(m => m.MarcasListComponent),
      },
      {
        path: 'cores',
        canActivate: [screenGuard('cores')],
        loadComponent: () =>
          import('./features/cores/cores-list.component').then(m => m.CoresListComponent),
      },
      {
        path: 'usuarios',
        canActivate: [screenGuard('usuarios')],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list.component').then(m => m.UsuariosListComponent),
      },
      {
        path: 'perfis',
        canActivate: [screenGuard('perfis')],
        loadComponent: () =>
          import('./features/perfis/perfis.component').then(m => m.PerfisComponent),
      },
      {
        path: 'perfil',
        canActivate: [screenGuard('perfil')],
        loadComponent: () =>
          import('./features/perfil/perfil.component').then(m => m.PerfilComponent),
      },
      {
        path: 'config/telas',
        canActivate: [screenGuard('config.telas')],
        loadComponent: () =>
          import('./features/configuracoes/telas/telas.component').then(m => m.TelasComponent),
      },
      {
        path: 'config/menus',
        canActivate: [screenGuard('config.menus')],
        loadComponent: () =>
          import('./features/configuracoes/menus/menus.component').then(m => m.MenusComponent),
      },
      {
        path: 'notificacoes',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/notificacoes/minha/minhas-notificacoes.component').then(m => m.MinhasNotificacoesComponent),
      },
      {
        path: 'notificacoes/admin',
        canActivate: [screenGuard('notificacoes.admin')],
        loadComponent: () =>
          import('./features/notificacoes/admin/notificacoes-admin.component').then(m => m.NotificacoesAdminComponent),
      },
      {
        path: 'parametros',
        canActivate: [screenGuard('parametros')],
        loadComponent: () =>
          import('./features/parametros/lista/parametros-lista.component').then(m => m.ParametrosListaComponent),
      },
      {
        path: 'parametros/grupos',
        canActivate: [screenGuard('parametros.grupos')],
        loadComponent: () =>
          import('./features/parametros/grupos/grupos-parametro.component').then(m => m.GruposParametroComponent),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/error/not-found.component').then(m => m.NotFoundComponent),
  },
];
