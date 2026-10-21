import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';

import { IToken } from '../models/interfaces';
import { LoginForm } from '../models/interfaces';
import { TokenService } from './token.service';
import { User } from '../models/user-model';
import { environment } from '../../../environments/environment';

const API_URL = environment.servidor + '/api/auth';

@Service()

export class AuthService {

  private http = inject(HttpClient);
  private readonly srvTokens = inject(TokenService);
  private readonly router = inject(Router);
  public userActualS = signal(new User);

  public login(datos : LoginForm) {
    console.log(datos);
    return this.http.patch<IToken>(API_URL, datos)
      .pipe(
        tap((tokens) => {
          console.log(tokens);
          this.doLogin(tokens);
        }),
        map(() => true),
        catchError((error) => {
         console.log(error);
         return of (error.status);
        })
      )
  }
  public logout() {
    if (this.isLoggedIn()) {
      this.http.patch(`${API_URL}/logout/${this.userActual.cedula}`,{})
        .subscribe();      
      this.doLogOut();   //Esto fuera del if 
    }
  }
  doLogin(tokens  : any) {
    //guardar los tokens
    this.srvTokens.setTokens(tokens);
    //actualizar datos globales para usuario y rol
    this.userActualS.set(this.userActual);
  }
  doLogOut() {
    //Eliminar los tokens
    if (this.srvTokens.token) {
      this.srvTokens.eliminarTokens();
    }
    //limpiar datos globales para usuario y rol
    this.userActualS.set(this.userActual);

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
      return new User({cedula: tokenD.sub, nombre: tokenD.nom, rol: tokenD.rol })
    }
  }
  public refreshSession() : any {
    if (this.isLoggedIn() && this.srvTokens.tokenTimeToExp() <= 20) {
      return this.http.patch<IToken>(`${API_URL}/refresh/${this.userActual.cedula}`, 
        {tkRef: this.srvTokens.refreshToken})
        .pipe(
          tap((tokens) => {
            //console.log(tokens);
            this.doLogin(tokens);
          }),
          map(() => true),
          catchError((error) => {
          // console.log(error);
          return of (error.status);
          })
        )      
    }
  }
}
