import { inject } from '@angular/core/primitives/di';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  //return true;
  //return false;
  const authService = inject(AuthService);

  if (authService.isLoggedIn()) {
    return true;
  }
  // avisa al backend si había token, limpia la sesión y navega a /login
  authService.loggout();
  return false;
};
