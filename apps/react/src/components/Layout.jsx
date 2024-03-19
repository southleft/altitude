import { NavLink, Outlet } from 'react-router-dom';
import { ALAvatar, ALBadge, ALButtonGroup, ALButton, ALCard, ALDivider, ALDrawer, ALHeader, ALHeading, ALIconBell, ALIconCalendar, ALIconChevronUp, ALIconHelp, ALIconHome, ALIconList, ALIconSettings, ALIconSignOut, ALIconSupport, ALIconUser, ALLayoutContainer, ALLayout, ALListItem, ALList, ALMenuItem, ALMenu, ALPopover, ALSearch, ALToggleButton } from 'al-react/dist/src';
import logo from '../images/logo.svg'
import './Layout.scss';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [currentTheme, setCurrentTheme] = useState('');

  const appendStyleSheet = (theme) => {
    let themeStyles;
    if (theme === 'theme-dark') {
      themeStyles = 'al-web-components/dist/css/tokens-dark.css';
    } else if (theme === 'theme-light') {
      themeStyles = 'al-web-components/dist/css/tokens-light.css';
    } else if (theme === 'brand-altitude') {
      themeStyles = 'al-web-components/dist/css/tokens-altitude.css';
    } else if (theme === 'brand-northright') {
      themeStyles = 'al-web-components/dist/css/tokens-northright.css';
    } else if (theme === 'brand-southleft') {
      themeStyles = 'al-web-components/dist/css/tokens-southleft.css';
    }

    const themeStyleElement = document.createElement('style');
    themeStyleElement.innerHTML = themeStyles;
    themeStyleElement.setAttribute('type', 'text/css');
    // themeStyleElement.setAttribute('id', 'al-theme-sheet');
    document.head.appendChild(themeStyleElement);
    setCurrentTheme(theme);
  };

  useEffect(() => {
    // Append the default stylesheet on component mount
    appendStyleSheet('dark');
  }, []); // Empty dependency array to run the effect only once on mount

  return (
    <div className="al-li-dashboard">
      <div className="al-l-dashboard__help-popover">
        <ALPopover position="top-left" isDismissible={true}>
          <ALToggleButton slot="trigger" variant="background">
            <ALIconHelp size="lg" />
          </ALToggleButton>
          <ALHeading slot="header" tagName="h3" variant="sm">Help Center</ALHeading>
          <p>Welcome to our Job Board Help Center! Whether you're a first-time user or seeking a refresher, this guide will walk you through the steps to navigate our platform with ease. Let's get started!</p>
          <p className="al-u-theme-typography-body-xs" slot="footer">1 of 4</p>
          <ALButtonGroup slot="footer" alignment="right">
            <ALButton variant="secondary">Learn More</ALButton>
            <ALButton>Next</ALButton>
          </ALButtonGroup>
        </ALPopover>
      </div>
      <ALLayout variant="sidebar-left" gap="none">
        <div className="al-l-dashboard__sidebar">
          <slot name="sidebar">
            <div className="al-l-dashboard__sidebar-logo">
              <NavLink to={"/"}><img src={logo} alt="logo" /></NavLink>
              <ALDivider></ALDivider>
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
                    <ALAvatar>TP</ALAvatar>
                    <p>TJ Pitre</p>
                    <ALButton variant="tertiary" hideText={true}><ALIconChevronUp slot="before"></ALIconChevronUp></ALButton>
                  </div>
                  <ALMenu>
                    <ALMenuItem><ALIconUser></ALIconUser>Profile</ALMenuItem>
                    <ALMenuItem><ALIconSettings></ALIconSettings>Settings</ALMenuItem>
                    <ALMenuItem><ALIconSupport></ALIconSupport>Support</ALMenuItem>
                    <ALMenuItem><ALIconSignOut></ALIconSignOut>Sign Out</ALMenuItem>
                  </ALMenu>
                </ALPopover>
              </div>
            </slot>
          </div>
          <div className="al-l-dashboard__content">
            <ALHeader className="al-l-dashboard__header">
              <ALSearch slot="before">
                <ALList>
                  <ALListItem>Dashboard</ALListItem>
                  <ALListItem>Job Board</ALListItem>
                  <ALListItem>Schedule</ALListItem>
                  <ALListItem>Resources</ALListItem>
                </ALList>
              </ALSearch>
              <div slot="after">
                <ALPopover variant="menu">
                  <ALButton slot="trigger" hideText={true} variant="tertiary"><ALIconSettings slot="before"></ALIconSettings>Settings</ALButton>
                  <ALMenu>
                    <ALMenuItem onClick={() => appendStyleSheet('theme-dark')}>Theme: Dark</ALMenuItem>
                    <ALMenuItem onClick={() => appendStyleSheet('theme-light')}>Theme: Light</ALMenuItem>
                    <ALMenuItem onClick={() => appendStyleSheet('brand-altitude')}>Brand: Altitude</ALMenuItem>
                    <ALMenuItem onClick={() => appendStyleSheet('brand-northright')}>Brand: Northright</ALMenuItem>
                    <ALMenuItem onClick={() => appendStyleSheet('brand-southleft')}>Brand: Southleft</ALMenuItem>
                  </ALMenu>
                </ALPopover>
              </div>
              <div slot="after">
                <ALDrawer alignment="right" hasBackdrop={true} width="400">
                  <ALButton slot="trigger" hideText={true} variant="tertiary"><ALBadge variant="danger" slot="after" isDot={true} className="al-l-dashboard__notifications-badge"></ALBadge><ALIconBell slot="after"></ALIconBell></ALButton>
                  <ALHeading slot="header" tagName="h3" variant="sm" isBold={true}>Notifications</ALHeading>
                  <div className="al-u-gap-xs">
                    <ALCard variant="bare" layout="inline" href="#">
                      <ALAvatar slot="image" hasBadge={true} badgeVariant="success">KP</ALAvatar>
                      <p className="al-u-theme-typography-body-sm"><strong>@kploransky</strong> sent you a message</p>
                      <p className="al-u-theme-typography-body-xs">Thursday 4:20pm</p>
                      <ALBadge slot="actions-start" variant="warning" isDot={true}></ALBadge>
                      <p slot="actions-end" className="al-u-theme-typography-body-xs">2 hours ago</p>
                    </ALCard>
                    <ALDivider></ALDivider>
                    <ALCard variant="bare" layout="inline" href="#">
                      <ALAvatar slot="image">EB</ALAvatar>
                      <p className="al-u-theme-typography-body-sm"><strong>@ebrown</strong> sent you a message</p>
                      <p className="al-u-theme-typography-body-xs">Thursday 5:14pm</p>
                      <ALBadge slot="actions-start" variant="warning" isDot={true}></ALBadge>
                      <p slot="actions-end" className="al-u-theme-typography-body-xs">3 hours ago</p>
                    </ALCard>
                    <ALDivider></ALDivider>
                    <ALCard variant="bare" layout="inline" href="#">
                      <ALAvatar slot="image">BV</ALAvatar>
                      <p className="al-u-theme-typography-body-sm"><strong>@bvoran</strong> invited you to a <strong>Design Systems Workshop</strong></p>
                      <p className="al-u-theme-typography-body-xs">Wednesday 6:32pm</p>
                      <p slot="actions-end" className="al-u-theme-typography-body-xs">1 day ago</p>
                    </ALCard>
                  </div>
                  <ALButton slot="footer">Mark all as read</ALButton>
                </ALDrawer>
              </div>
              <div slot="after">
                <ALPopover variant="menu">
                  <ALAvatar slot="trigger">TP</ALAvatar>
                  <ALMenu>
                    <ALMenuItem><ALIconUser></ALIconUser>Profile</ALMenuItem>
                    <ALMenuItem><ALIconSettings></ALIconSettings>Settings</ALMenuItem>
                    <ALMenuItem><ALIconSupport></ALIconSupport>Support</ALMenuItem>
                    <ALMenuItem><ALIconSignOut></ALIconSignOut>Sign Out</ALMenuItem>
                  </ALMenu>
                </ALPopover>
              </div>
            </ALHeader>
            <ALLayoutContainer className="al-l-dashboard__body">
              <Outlet />
            </ALLayoutContainer>
          </div>
        </ALLayout>
    </div>
  );
}