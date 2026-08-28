import { NavLink, Outlet } from 'react-router-dom';
import { ALAvatar, ALBadge, ALButton, ALCard, ALDivider, ALDrawer, ALHeader, ALHeading, ALIconBell, ALIconCalendar, ALIconChevronUp, ALIconHelp, ALIconHome, ALIconList, ALLogo, ALIconSettings, ALIconSignOut, ALIconSupport, ALIconUser, ALLayout, ALListItem, ALList, ALMenuItem, ALMenu, ALPopover, ALSearch, ALToggleButton, ALThemeSwitcher } from '@southleft/al-react';
import './Layout.scss';

export default function Dashboard() {
  let currentLogo;
  document.addEventListener('onThemeSwitcherChange', (event) => {
    currentLogo = event.detail.currentLogo;
  });

  return (
    <div className="al-l-dashboard">
      <div className="al-l-dashboard__help-popover">
        <ALPopover position="top-left" isDismissible={true}>
          <ALToggleButton slot="trigger" variant="background">
            <ALIconHelp size="lg" />
          </ALToggleButton>
          <ALHeading slot="header" tagName="h3" variant="sm">Help Center</ALHeading>
          <p>Welcome to our Job Board Help Center! Whether you're a first-time user or seeking a refresher, this guide will walk you through the steps to navigate our platform with ease. Let's get started!</p>
          <p className="al-u-theme-typography-body-xs" slot="footer">1 of 4</p>
          <ALLayout slot="footer" direction="row" justify="end" grow>
            <ALButton variant="secondary">Learn More</ALButton>
            <ALButton>Next</ALButton>
          </ALLayout>
        </ALPopover>
      </div>
      <ALLayout variant="grid" gap="none" fullHeight noCollapse className="al-l-dashboard__shell">
        <div className="al-l-dashboard__sidebar">
          <ALLayout direction="column" justify="between" fullHeight>
            <div className="al-l-dashboard__sidebar-logo">
              <ALLayout direction="row" align="center">
                <ALLogo variant={currentLogo !== 'altitude' ? currentLogo : null}>
                  {currentLogo !== 'southleft' ? 'By Southleft • ' : ''}
                  {'React Web Application'}
                </ALLogo>
              </ALLayout>
            </div>
            <ALMenu className="al-l-dashboard__sidebar-menu">
              <NavLink to={'/dashboard'}>
              {({ isActive }) => (
                <ALMenuItem isHeader={true} isSelected={isActive}>
                  <ALIconHome slot="before"></ALIconHome>Dashboard<ALBadge variant="danger">12</ALBadge>
                </ALMenuItem>
              )}
              </NavLink>
              <NavLink to={'/'} className="al-l-dashboard__menu-link--header">
                {({ isActive }) => (
                  <ALMenuItem isHeader={true} isSelected={isActive}><ALIconList slot="before"></ALIconList>Job Board</ALMenuItem>
                )}
              </NavLink>
                <ALMenuItem isHeader={true}><ALIconCalendar slot="before"></ALIconCalendar>Schedule</ALMenuItem>
                <ALMenuItem isHeader={true} isExpandableHeader={true}><ALIconSupport slot="before"></ALIconSupport>Resources</ALMenuItem>
                <ALMenuItem>Contact Us</ALMenuItem>
                <ALMenuItem>Customer Support</ALMenuItem>
              </ALMenu>
              <div className="al-l-dashboard__sidebar-user">
                <ALDivider></ALDivider>
                <ALPopover position="top-right" variant="menu">
                  <div slot="trigger" className="al-l-dashboard__user">
                    <ALCard variant="bare" layout="inline">
                      <ALAvatar slot="image">TP</ALAvatar>
                      <p>TJ Pitre</p>
                      <ALButton slot="actions-end" variant="bare" hideText={true}><ALIconChevronUp slot="before"></ALIconChevronUp></ALButton>
                    </ALCard>
                  </div>
                  <ALMenu>
                    <ALMenuItem><ALIconUser></ALIconUser>Profile</ALMenuItem>
                    <ALMenuItem><ALIconSettings></ALIconSettings>Settings</ALMenuItem>
                    <ALMenuItem><ALIconSupport></ALIconSupport>Support</ALMenuItem>
                    <ALMenuItem><ALIconSignOut></ALIconSignOut>Sign Out</ALMenuItem>
                  </ALMenu>
                </ALPopover>
              </div>
          </ALLayout>
          </div>
          <div className="al-l-dashboard__content">
            <ALHeader className="al-l-dashboard__header" sticky elevated>
              <ALLayout direction="row" align="center" justify="between" gap="md">
              <ALSearch>
                <ALList>
                  <ALListItem>Dashboard</ALListItem>
                  <ALListItem>Job Board</ALListItem>
                  <ALListItem>Schedule</ALListItem>
                  <ALListItem>Resources</ALListItem>
                </ALList>
              </ALSearch>
              <ALLayout direction="row" align="center" gap="sm">
                <ALThemeSwitcher></ALThemeSwitcher>
                <ALDrawer alignment="right" hasBackdrop={true} width="400">
                  <ALButton slot="trigger" hideText={true} variant="bare"><ALBadge variant="danger" slot="after" isDot={true} className="al-l-dashboard__notifications-badge"></ALBadge><ALIconBell slot="after"></ALIconBell></ALButton>
                  <ALHeading slot="header" tagName="h3" variant="sm" isBold={true}>Notifications</ALHeading>
                  <ALLayout direction="column" gap="sm">
                    <ALCard variant="bare" layout="inline">
                      <ALAvatar slot="image" hasBadge={true} badgeVariant="success">KP</ALAvatar>
                      <p className="al-u-theme-typography-body-sm"><strong>@kploransky</strong> sent you a message</p>
                      <p className="al-u-theme-typography-body-xs">Thursday 4:20pm</p>
                      <ALBadge slot="actions-start" variant="warning" isDot={true}></ALBadge>
                      <p slot="actions-end" className="al-u-theme-typography-body-xs">2 hours ago</p>
                    </ALCard>
                    <ALDivider></ALDivider>
                    <ALCard variant="bare" layout="inline">
                      <ALAvatar slot="image">EB</ALAvatar>
                      <p className="al-u-theme-typography-body-sm"><strong>@ebrown</strong> sent you a message</p>
                      <p className="al-u-theme-typography-body-xs">Thursday 5:14pm</p>
                      <ALBadge slot="actions-start" variant="warning" isDot={true}></ALBadge>
                      <p slot="actions-end" className="al-u-theme-typography-body-xs">3 hours ago</p>
                    </ALCard>
                    <ALDivider></ALDivider>
                    <ALCard variant="bare" layout="inline">
                      <ALAvatar slot="image">BV</ALAvatar>
                      <p className="al-u-theme-typography-body-sm"><strong>@bvoran</strong> invited you to a <strong>Design Systems Workshop</strong></p>
                      <p className="al-u-theme-typography-body-xs">Wednesday 6:32pm</p>
                      <p slot="actions-end" className="al-u-theme-typography-body-xs">1 day ago</p>
                    </ALCard>
                  </ALLayout>
                  <ALButton slot="footer">Mark all as read</ALButton>
                </ALDrawer>
                <ALPopover variant="menu">
                  <ALAvatar slot="trigger">TP</ALAvatar>
                  <ALMenu>
                    <ALMenuItem><ALIconUser></ALIconUser>Profile</ALMenuItem>
                    <ALMenuItem><ALIconSettings></ALIconSettings>Settings</ALMenuItem>
                    <ALMenuItem><ALIconSupport></ALIconSupport>Support</ALMenuItem>
                    <ALMenuItem><ALIconSignOut></ALIconSignOut>Sign Out</ALMenuItem>
                  </ALMenu>
                </ALPopover>
              </ALLayout>
              </ALLayout>
            </ALHeader>
            <ALLayout variant="constrained" size="xl" gutter="sm" className="al-l-dashboard__body">
                <Outlet />
            </ALLayout>
          </div>
        </ALLayout>
    </div>
  );
}
