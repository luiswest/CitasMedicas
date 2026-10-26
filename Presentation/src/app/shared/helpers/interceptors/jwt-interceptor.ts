import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../../services/token-service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenService).token;
   //"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjaXRhcy1tZWRpY2FzLWJ1c2luZXNzIiwiaWF0IjoxNzkyOTAyNDU2LCJleHAiOjE3OTI5MDYwNTYsInN1YiI6IjgiLCJ1c2VybmFtZSI6Imx1aXNhY28yIiwicm9sX2lkIjozfQ.3OzdNHsWnZfH3ts2NBdK_TTnNL1haHoGFElK8p__x8A";
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  }
  return next(req);
};
