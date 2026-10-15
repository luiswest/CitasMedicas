import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MedicoComponent } from './components/medico-component/medico-component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MedicoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Presentation');
}
