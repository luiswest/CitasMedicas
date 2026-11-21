import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';

import { IToken } from '../models/interfaces';
import { LoginForm } from '../models/interfaces';
import { TokenService } from './token.service';
import { User } from '../models/user-model';
import { environment } from '../../../environments/environment';

const API_URL = environment.servidor + '/auth';

@Service()

export class AuthService {

  private http = inject(HttpClient);
  private readonly srvTokens = inject(TokenService);
  private readonly router = inject(Router);
  public userActualS = signal(new User);
  public sesionActiva = signal(this.isLoggedIn());
  private timerExp?: ReturnType<typeof setTimeout>;

  constructor() {
    // al recargar la página con una sesión vigente, reprogramar el cierre
    if (this.isLoggedIn()) {
      this.programarCierre();
    }
  }

  private programarCierre() {
    clearTimeout(this.timerExp);
    // 1 s de margen para que el DELETE de loggout salga con un token aún válido.
    // Siempre se usa setTimeout (aunque ms <= 0) para no hacer peticiones HTTP
    // mientras el servicio se construye (evita dependencia circular con los interceptores).
    const ms = Math.max(this.srvTokens.tokenTimeToExp() * 1000 - 1000, 0);
    //console.log(`[auth] cierre programado en ${Math.round(ms / 1000)} s`); 
    this.timerExp = setTimeout(() => {
      //console.log('[auth] temporizador disparado → loggout');
      this.loggout();
    }, ms);
  }

  public login(datos : LoginForm) {
    // Descartar tokens de una sesión anterior (p. ej. vencidos en localStorage)
    // para que no viajen en la petición ni disparen el cierre/refresco automático.
    clearTimeout(this.timerExp);
    this.srvTokens.removeTokens();
    return this.http.post<IToken>(`${API_URL}/login`, datos)
      .pipe(
        tap((tokens) => {
          this.doLogin(tokens);
        }),
        map(() => true),
        catchError((error) => {
         return of (error.status);
        })
      )
  }
  public loggout() { //Cambio 18-11-2026
    if (this.srvTokens.token) {
      this.http.delete(`${API_URL}/loggout/${this.userActual.id}`,{})
        .subscribe();
    }
    this.doLogOut();
  }
  public sesionVencida() : boolean {
    return !!this.srvTokens.token && !!this.srvTokens.jwtTokenExp();
  }
  doLogin(tokens  : any) {
    //guardar los tokens
    this.srvTokens.setTokens(tokens);
    //actualizar datos globales para usuario y rol
    this.userActualS.set(this.userActual);
    this.sesionActiva.set(true);
    //programar el cierre de sesión al vencer el token
    this.programarCierre();
  }
  doLogOut() {
    clearTimeout(this.timerExp);
    //Eliminar los tokens
    if (this.srvTokens.token) {
      this.srvTokens.removeTokens();
    }
    //limpiar datos globales para usuario y rol
    this.userActualS.set(this.userActual);
    this.sesionActiva.set(false);

    //navegar a la página de login
    this.router.navigate(['/login']);
  }
  public isLoggedIn() : boolean {
    return !!this.srvTokens.token && !this.srvTokens.jwtTokenExp();
  }
  private get userActual() : User {
    if(!this.srvTokens.token) {
      return new User();
    } else {
      const tokenD = this.srvTokens.decodeToken();
      return new User({id: tokenD.sub, username: tokenD.username, rol_id: tokenD.rol_id })
    }
  }
  public refreshSession() : any {
    if (this.isLoggedIn() && this.srvTokens.tokenTimeToExp() <= 20) {
      //console.log('[auth] refrescando sesión');
      return this.http.patch<IToken>(`${API_URL}/refresh-session/${this.userActual.id}`,
        {tkRef: this.srvTokens.refreshToken})
        .pipe(
          tap((tokens) => {
            //console.log(tokens);
            if (this.srvTokens.token) {   // si ya se cerró la sesión, ignorar la respuesta
              this.doLogin(tokens);
            }
          }),
          map(() => true),
          catchError((error) => {
            return of (error.status);
          })
        )
    }
    return of(false);
  }
}
