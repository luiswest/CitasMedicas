import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  // Las peticiones de /auth (login, loggout, refresh-session) no deben
  // disparar el cierre ni el refresco de sesión: generan ciclos y, en el login,
  // pueden actuar sobre tokens viejos guardados en el navegador.
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const srvAuth = inject(AuthService);

  return next(req)
  .pipe(
      finalize(
        () => {
          if (srvAuth.sesionVencida()) {
            // hay token pero ya venció → cerrar sesión y mostrar login
            srvAuth.loggout();
          } else {
            srvAuth.refreshSession().subscribe();
          }
        })
    );
};
