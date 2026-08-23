import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import "al-web-components/components/avatar";
import "al-web-components/components/badge";
import "al-web-components/components/button";
import "al-web-components/components/card";
import "al-web-components/components/divider";
import "al-web-components/components/drawer";
import "al-web-components/components/header";
import "al-web-components/components/heading";
import "al-web-components/components/icon/icons/bell";
import "al-web-components/components/icon/icons/calendar";
import "al-web-components/components/icon/icons/chevron-up";
import "al-web-components/components/icon/icons/help";
import "al-web-components/components/icon/icons/home";
import "al-web-components/components/icon/icons/list";
import "al-web-components/components/icon/icons/settings";
import "al-web-components/components/icon/icons/sign-out";
import "al-web-components/components/icon/icons/support";
import "al-web-components/components/icon/icons/user";
import "al-web-components/components/layout";
import "al-web-components/components/list-item";
import "al-web-components/components/list";
import "al-web-components/components/logo";
import "al-web-components/components/menu-item";
import "al-web-components/components/menu";
import "al-web-components/components/popover";
import "al-web-components/components/search";
import "al-web-components/components/toggle-button";
import "al-web-components/components/theme-switcher";

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
