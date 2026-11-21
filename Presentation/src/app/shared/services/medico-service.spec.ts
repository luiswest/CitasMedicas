import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedicoService } from './medico-service';
import { MedicoCreateInput, MedicoModel } from '../models/medico-model';
import { environment } from '../../../environments/environment';

const API = environment.servidor;

describe('MedicoService', () => {
  let service: MedicoService;
  let httpTesting: HttpTestingController;

  const medico: MedicoModel = {
    id: 1,
    nombre_completo: 'Ana Médica',
    especialidad_id: 2,
    especialidad_nombre: 'Cardiología',
    licencia: 'LIC-123',
    telefono: '8888-1234',
  };
  const respuestaLista = { data: [medico], pagination: { offset: 0, limit: 5, total: 1 } };

  const estabilizar = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedicoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('se crea el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('medicos (listado filtrado)', () => {
    it('no hace ninguna petición mientras no se haya llamado a filtrar()', () => {
      TestBed.tick();

      httpTesting.expectNone(() => true);
      expect(service.medicos.value()).toBeUndefined();
      expect(service.medicos.status()).toBe('idle');
    });

    it('hace GET a /medicos/filter/0/5 con los parámetros del filtro', () => {
      service.filtrar({ nombre: 'Ana', cedula: 'LIC', especialidad: 'Cardio' });
      TestBed.tick();

      const req = httpTesting.expectOne((r) => r.url === `${API}/medicos/filter/0/5`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('nombre')).toBe('Ana');
      expect(req.request.params.get('cedula')).toBe('LIC');
      expect(req.request.params.get('especialidad')).toBe('Cardio');
      req.flush(respuestaLista);
    });

    it('expone la respuesta del API en medicos.value()', async () => {
      service.filtrar({ nombre: '' });
      TestBed.tick();
      httpTesting.expectOne(`${API}/medicos/filter/0/5?nombre=`).flush(respuestaLista);
      await estabilizar();

      expect(service.medicos.status()).toBe('resolved');
      expect(service.medicos.value()).toEqual(respuestaLista);
    });

    it('vuelve a consultar cuando se reutiliza y modifica el mismo objeto de filtro', () => {
      const parametros = { nombre: 'Ana', cedula: '', especialidad: '' };
      const vacia = { data: [], pagination: { offset: 0, limit: 5, total: 0 } };

      service.filtrar(parametros);
      TestBed.tick();
      httpTesting.expectOne((r) => r.params.get('nombre') === 'Ana').flush(vacia);

      parametros.nombre = 'Luis';
      service.filtrar(parametros);
      TestBed.tick();
      httpTesting.expectOne((r) => r.params.get('nombre') === 'Luis').flush(vacia);
    });

    it('pasa a estado error cuando el API falla', async () => {
      service.filtrar({ nombre: '' });
      TestBed.tick();
      httpTesting
        .expectOne((r) => r.url === `${API}/medicos/filter/0/5`)
        .flush('fallo', { status: 500, statusText: 'Server Error' });
      await estabilizar();

      expect(service.medicos.status()).toBe('error');
      expect(service.medicos.error()).toBeTruthy();
    });
  });

  describe('medicoPorId', () => {
    it('no hace ninguna petición mientras no se haya llamado a buscarPorId()', () => {
      TestBed.tick();

      httpTesting.expectNone(() => true);
      expect(service.medicoPorId.status()).toBe('idle');
    });

    it('hace GET a /medicos/:id y expone el médico encontrado', async () => {
      service.buscarPorId(1);
      TestBed.tick();

      const req = httpTesting.expectOne(`${API}/medicos/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: medico });
      await estabilizar();

      expect(service.medicoPorId.status()).toBe('resolved');
      expect(service.medicoPorId.value()?.data).toEqual(medico);
    });

    it('consulta de nuevo cuando cambia el id buscado', () => {
      service.buscarPorId(1);
      TestBed.tick();
      httpTesting.expectOne(`${API}/medicos/1`).flush({ data: medico });

      service.buscarPorId(2);
      TestBed.tick();
      httpTesting.expectOne(`${API}/medicos/2`).flush({ data: { ...medico, id: 2 } });
    });

    it('pasa a estado error cuando el médico no existe', async () => {
      service.buscarPorId(99);
      TestBed.tick();
      httpTesting.expectOne(`${API}/medicos/99`).flush('No encontrado', { status: 404, statusText: 'Not Found' });
      await estabilizar();

      expect(service.medicoPorId.status()).toBe('error');
    });
  });

  describe('guardar()', () => {
    const datos: MedicoCreateInput = {
      nombre_completo: 'Ana Médica',
      especialidad_id: 2,
      licencia: 'LIC-123',
      telefono: '8888-1234',
      username: 'ana',
      password: 'secreto',
    };

    it('hace POST a /medicos cuando no se indica id (creación)', () => {
      let respuesta: unknown;
      service.guardar(datos).subscribe((r) => (respuesta = r));

      const req = httpTesting.expectOne(`${API}/medicos`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(datos);
      req.flush({ id: 10 });

      expect(respuesta).toEqual({ id: 10 });
    });

    it('hace PUT a /medicos/:id cuando se indica id (modificación)', () => {
      service.guardar(datos, 5).subscribe();

      const req = httpTesting.expectOne(`${API}/medicos/5`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(datos);
      req.flush({});
    });

    it('trata el id 0 como modificación (PUT) y no como creación', () => {
      service.guardar(datos, 0).subscribe();

      const req = httpTesting.expectOne(`${API}/medicos/0`);
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('propaga el error del API al suscriptor', () => {
      let status: number | undefined;
      service.guardar(datos).subscribe({ error: (e) => (status = e.status) });

      httpTesting.expectOne(`${API}/medicos`).flush('Conflicto', { status: 409, statusText: 'Conflict' });

      expect(status).toBe(409);
    });
  });
});
