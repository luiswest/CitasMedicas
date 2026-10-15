import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { MedicoModel } from '../models/medico-model';
import { environment } from '../../../environments/environment.development';

type ParametrosMedico = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;
interface RespuestaMedicos {
  data: MedicoModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

@Injectable({ providedIn: 'root' })
export class MedicoService {
  private readonly parametros = signal<ParametrosMedico | null>(null);
  private readonly http = inject(HttpClient);
  
  readonly medicos = httpResource<RespuestaMedicos>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url:  `${_SERVIDOR}/medicos/filter/0/5`,
      params: parametros,
    };
  });

  filtrar(parametros: ParametrosMedico): void {
    this.parametros.set(parametros);
  }
  createMedico(datos : MedicoModel) {
    
  }

    guardar(datos : MedicoModel, id? : number) {
    delete datos.id;

    if (id) { //Modificando el cliente
      return this.http.put<any>(`${_SERVIDOR}/medicos/${id}`, datos);
    } else { //Nuevo cliente
      return this.http.post<any>(`${_SERVIDOR}/medicos`, datos);
    }
  }
}
