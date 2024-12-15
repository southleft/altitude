import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import "@southleft/al-web-components/dist/components/avatar/avatar.js";
import "@southleft/al-web-components/dist/components/badge/badge.js";
import "@southleft/al-web-components/dist/components/button-group/button-group.js";
import "@southleft/al-web-components/dist/components/button/button.js";
import "@southleft/al-web-components/dist/components/card/card.js";
import "@southleft/al-web-components/dist/components/divider/divider.js";
import "@southleft/al-web-components/dist/components/drawer/drawer.js";
import "@southleft/al-web-components/dist/components/header/header.js";
import "@southleft/al-web-components/dist/components/heading/heading.js";
import "@southleft/al-web-components/dist/components/icon/icons/bell.js";
import "@southleft/al-web-components/dist/components/icon/icons/calendar.js";
import "@southleft/al-web-components/dist/components/icon/icons/chevron-up.js";
import "@southleft/al-web-components/dist/components/icon/icons/help.js";
import "@southleft/al-web-components/dist/components/icon/icons/home.js";
import "@southleft/al-web-components/dist/components/icon/icons/list.js";
import "@southleft/al-web-components/dist/components/icon/icons/settings.js";
import "@southleft/al-web-components/dist/components/icon/icons/sign-out.js";
import "@southleft/al-web-components/dist/components/icon/icons/support.js";
import "@southleft/al-web-components/dist/components/icon/icons/user.js";
import "@southleft/al-web-components/dist/components/layout-container/layout-container.js";
import "@southleft/al-web-components/dist/components/layout/layout.js";
import "@southleft/al-web-components/dist/components/list-item/list-item.js";
import "@southleft/al-web-components/dist/components/list/list.js";
import "@southleft/al-web-components/dist/components/logo/logo.js";
import "@southleft/al-web-components/dist/components/menu-item/menu-item.js";
import "@southleft/al-web-components/dist/components/menu/menu.js";
import "@southleft/al-web-components/dist/components/popover/popover.js";
import "@southleft/al-web-components/dist/components/search/search.js";
import "@southleft/al-web-components/dist/components/toggle-button/toggle-button.js";
import "@southleft/al-web-components/dist/components/theme-switcher/theme-switcher.js";

@Component({
  selector: 'app-root',
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
