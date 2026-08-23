import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import "@southleft/al-web-components/components/avatar";
import "@southleft/al-web-components/components/badge";
import "@southleft/al-web-components/components/button";
import "@southleft/al-web-components/components/card";
import "@southleft/al-web-components/components/divider";
import "@southleft/al-web-components/components/drawer";
import "@southleft/al-web-components/components/header";
import "@southleft/al-web-components/components/heading";
import "@southleft/al-web-components/components/icon/icons/bell";
import "@southleft/al-web-components/components/icon/icons/calendar";
import "@southleft/al-web-components/components/icon/icons/chevron-up";
import "@southleft/al-web-components/components/icon/icons/help";
import "@southleft/al-web-components/components/icon/icons/home";
import "@southleft/al-web-components/components/icon/icons/list";
import "@southleft/al-web-components/components/icon/icons/settings";
import "@southleft/al-web-components/components/icon/icons/sign-out";
import "@southleft/al-web-components/components/icon/icons/support";
import "@southleft/al-web-components/components/icon/icons/user";
import "@southleft/al-web-components/components/layout";
import "@southleft/al-web-components/components/list-item";
import "@southleft/al-web-components/components/list";
import "@southleft/al-web-components/components/logo";
import "@southleft/al-web-components/components/menu-item";
import "@southleft/al-web-components/components/menu";
import "@southleft/al-web-components/components/popover";
import "@southleft/al-web-components/components/search";
import "@southleft/al-web-components/components/toggle-button";
import "@southleft/al-web-components/components/theme-switcher";

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'angular';

  activePaths: string[] = ['/', '/dashboard', '/job-board'];
  activePath: string = '';
  currentLogo: string = '';

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.activePath = this.getActivePath(event.url);
      }
    });
    document.addEventListener('onThemeSwitcherChange', (event) => {
      const target = event as CustomEvent;
      this.currentLogo = target.detail.currentLogo;
    });
  }

  private getActivePath(url: string): string {
    const activePath = this.activePaths.find(path => url === path);
    return activePath || '/';
  }
}
