import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import "al-web-components/dist/components/avatar/avatar.js";
import "al-web-components/dist/components/badge/badge.js";
import "al-web-components/dist/components/button-group/button-group.js";
import "al-web-components/dist/components/button/button.js";
import "al-web-components/dist/components/card/card.js";
import "al-web-components/dist/components/divider/divider.js";
import "al-web-components/dist/components/drawer/drawer.js";
import "al-web-components/dist/components/header/header.js";
import "al-web-components/dist/components/heading/heading.js";
import "al-web-components/dist/components/icon/icons/bell.js";
import "al-web-components/dist/components/icon/icons/calendar.js";
import "al-web-components/dist/components/icon/icons/chevron-up.js";
import "al-web-components/dist/components/icon/icons/help.js";
import "al-web-components/dist/components/icon/icons/home.js";
import "al-web-components/dist/components/icon/icons/list.js";
import "al-web-components/dist/components/icon/icons/settings.js";
import "al-web-components/dist/components/icon/icons/sign-out.js";
import "al-web-components/dist/components/icon/icons/support.js";
import "al-web-components/dist/components/icon/icons/user.js";
import "al-web-components/dist/components/layout-container/layout-container.js";
import "al-web-components/dist/components/layout/layout.js";
import "al-web-components/dist/components/list-item/list-item.js";
import "al-web-components/dist/components/list/list.js";
import "al-web-components/dist/components/logo/logo.js";
import "al-web-components/dist/components/menu-item/menu-item.js";
import "al-web-components/dist/components/menu/menu.js";
import "al-web-components/dist/components/popover/popover.js";
import "al-web-components/dist/components/search/search.js";
import "al-web-components/dist/components/toggle-button/toggle-button.js";
import "al-web-components/dist/components/theme-switcher/theme-switcher.js";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'angular';

  activePaths: string[] = ['/', '/dashboard', '/job-board'];
  activePath: string = '';
  currentTheme: string = '';

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.activePath = this.getActivePath(event.url);
      }
    });
    document.addEventListener('onThemeSwitcherChange', (event) => {
      const target = event as CustomEvent;
      this.currentTheme = target.detail.currentTheme;
    });
  }

  private getActivePath(url: string): string {
    const activePath = this.activePaths.find(path => url === path);
    return activePath || '/';
  }
}
