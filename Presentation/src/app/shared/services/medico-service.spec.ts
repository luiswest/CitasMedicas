import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedicoService } from './medico-service';

describe('MedicoService', () => {
  let service: MedicoService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedicoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request again when the same filter object is changed', () => {
    const parametros = { nombre: 'Ana', cedula: '', especialidad: '', licencia: '' };
    const response = { data: [], pagination: { offset: 0, limit: 5, total: 0 } };

    service.filtrar(parametros);
    TestBed.flushEffects();
    httpTesting.expectOne((request) => request.params.get('nombre') === 'Ana').flush(response);

    parametros.nombre = 'Luis';
    service.filtrar(parametros);
    TestBed.flushEffects();

    httpTesting.expectOne((request) => request.params.get('nombre') === 'Luis').flush(response);
  });
});
