import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import "al-web-components/dist/css/head.css";
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  title = 'angular';

  constructor() {
    if (globalThis.customElements) {
      // Load the web component when the app is loaded
      import("al-web-components/dist/components/button/button.js");
    }
  }

}
