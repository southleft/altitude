---
title: AI-Chat
description: Eigenen AI-Agenten über MCP verbinden; der integrierte Chat ist in dieser Distribution nicht verfügbar.
---

# AI-Chat

::: warning In dieser Distribution nicht verfügbar
Der integrierte AI-Chat, das Tastenkürzel <kbd>⌘</kbd><kbd>J</kbd> sowie die Einstellungen **KI und Agenten** und **Nutzung** sind in dieser Distribution nicht enthalten. Verbinden Sie stattdessen einen vorhandenen Agenten wie Claude Code, Claude Desktop oder Cursor über den [MCP-Server](/programmable/mcp-server). Die Schaltfläche **KI verbinden** oben im rechten Panel zeigt die Einrichtungsschritte; siehe [Connect AI](/programmable/mcp-server#connect-ai).
:::

Über MCP verbundene Agenten nutzen Ihr eigenes Abonnement, daher benötigt OpenPencil keine API-Schlüssel von Anbietern. Sie arbeiten mit dem Dokument, das in der Desktop-App geöffnet ist.

## Werkzeuge

Agenten verfügen über mehr als 90 Werkzeuge für Erstellung, Gestaltung, Anordnung, Komponenten, Variablen, Suche, Prüfung, Analyse, Export und Vektorbearbeitung.

## Visuelle Prüfung

Nach Änderungen kann ein Agent das Ergebnis mit `export_image` rendern und mit der Anfrage vergleichen. Dadurch werden Anordnungsfehler, fehlende Elemente und abweichende Farben sichtbar.

## Hinweise

- Vor der Anfrage die betreffenden Objekte auswählen; Agenten können die aktuelle Auswahl lesen.
- Farben, Größen und Positionen möglichst genau angeben.
- Eine Anfrage kann mehrere Objekte ändern.
- Änderungen durch AI können rückgängig gemacht werden.
- Nach jedem Werkzeugaufruf wird die Anordnung neu berechnet.
