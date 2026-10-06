---
title: Warstwy i strony
description: Praca z warstwami, stronami i panelem właściwości w OpenPencil.
---

# Warstwy i strony

Interfejs edytora składa się z warstw po lewej stronie, obszaru roboczego pośrodku i właściwości po prawej. Szerokość paneli bocznych można zmieniać przez przeciąganie separatorów.

## Warstwy

Lewy panel przedstawia hierarchię dokumentu jako drzewo.

- Kliknij strzałkę obok ramki, grupy lub komponentu, aby pokazać albo ukryć elementy potomne.
- Przeciągaj warstwy, aby zmienić kolejność albo obiekt nadrzędny.
- Kliknij ikonę oka, aby ukryć lub pokazać warstwę.
- Kliknij nazwę dwukrotnie, aby ją zmienić.

Wybranie warstwy na liście zaznacza odpowiadający jej obiekt na obszarze roboczym i odwrotnie.

## Strony

- Kliknij stronę, aby do niej przejść. OpenPencil przywróci zapisane położenie i powiększenie.
- Użyj przycisku dodawania, aby utworzyć stronę.
- Usuń bieżącą stronę za pomocą odpowiedniego działania.
- Kliknij nazwę dwukrotnie, aby ją zmienić.

Każda strona ma własny kolor tła, położenie widoku i powiększenie.

## Właściwości

### Projekt

Karta pokazuje właściwości zaznaczonych obiektów:

- **Wygląd:** przezroczystość, wspólny albo niezależny promień narożników i widoczność;
- **Zalew:** kolor jednolity, gradienty liniowy, radialny, kątowy i diamentowy, obraz oraz powiązanie ze zmienną;
- **Obwiednia:** kolor, grubość, zakończenia, połączenia i kreskowanie;
- **Efekty:** cień zewnętrzny i wewnętrzny oraz rozmycie warstwy, tła i pierwszego planu;
- **Typografia:** rodzina, rozmiar i odmiana czcionki oraz przyciski B/I/U/S;
- **Układ:** ustawienia [automatycznego układu](./auto-layout);
- **Eksport:** skala, format i przycisk eksportu.

Jeśli nic nie jest zaznaczone, karta pokazuje właściwości strony.

### Kod

Zaznaczony obiekt jest prezentowany jako JSX z wyróżnianiem składni. Dostępny jest także HTML z klasami Tailwind CSS v4.

### Zmienne

Karta pokazuje liczbę zmiennych i kolekcji, wybór trybu dla kolekcji z więcej niż jednym trybem oraz przycisk **Importuj tokeny…**. Ikona ustawień otwiera okno zmiennych. Zobacz [Zmienne](./variables).

### Połącz AI

Przycisk **Połącz AI** u góry panelu otwiera kroki konfiguracji, które łączą Claude Code, Claude Desktop, Cursor lub innego klienta MCP z lokalnym serwerem MCP. Zobacz [serwer MCP](/programmable/mcp-server#connect-ai).

## Małe ekrany

Na telefonach i małych ekranach panele boczne zastępuje wysuwany panel dolny z kartami „Warstwy”, „Projekt”, „Zmienne” i „Kod”. Panel narzędzi staje się zwartym poziomym paskiem.

## Wskazówki

- Szerokość paneli jest zapisywana po ponownym załadowaniu.
- Drzewo warstw pomaga wybrać zasłonięty obiekt.
- Dodatkowe operacje znajdują się w [menu kontekstowym](./context-menu).
