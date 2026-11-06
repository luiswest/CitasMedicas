import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const srvAuth = inject(AuthService);
  return next(req)
  .pipe(
      finalize(
        () => {
          srvAuth.refreshSession().subscribe();
        })
    );
};
