# Auth — Authorship Highlighter

Auth is an [Obsidian](https://obsidian.md) plugin that marks text by authorship — your own writing, quoted material, and AI-generated content. Each note's class is set via the frontmatter `auth:` field (`self`, `other`, `ai`, `none`, `off`, or user-defined synonyms); fragment ranges are stored separately in `authorship-db.json` and follow edits via CM6's `mapPos`. A paste dialog prompts for authorship on longer pastes; notes can also be auto-classified by tag. Visual styles — highlights, gradients, underlines, left-edge stripe and glow — are configurable per type with live preview. Inspired by [obsidian-authorship](https://github.com/rflpazini/obsidian-authorship); code written from scratch with [Claude](https://claude.ai) (Anthropic).

## Installation

Download `main.js`, `styles.css`, and `manifest.json` from Releases and place them in `.obsidian/plugins/yule-auth/`, then enable the plugin in Obsidian settings.

## Compatibility

Obsidian ≥ 1.4.0. Tested in Live Preview and Reading View.

Плагин для [Obsidian](https://obsidian.md), подсвечивающий текст по авторству: свой, чужой, сгенерированный ИИ.

Вдохновлён плагином [obsidian-authorship](https://github.com/rflpazini/obsidian-authorship). Код написан с нуля при участии Claude (Anthropic).

---

## Классы авторства для всей заметки

Класс задаётся полем `auth:` во frontmatter заметки.

| Значение | Смысл |
|---|---|
| `self` | Свой текст |
| `other` | Чужой текст, цитаты, выписки |
| `ai` | Текст, сгенерированный ИИ |
| `none` | Без класса (фрагменты отображаются) |
| `off` | Временно отключить всю разметку заметки |

Принимаются пользовательские синонимы — настраиваются в разделе «Синонимы значений».

---

## Разметка фрагментов

Отдельные фрагменты помечаются командами из палитры:

- `auth: Mark selection as my text`
- `auth: Mark selection as other text`
- `auth: Mark selection as AI`
- `auth: Remove authorship at cursor / selection`
- `auth: Suspend all markup for this note (off)`

Позиции фрагментов хранятся в `.obsidian/plugins/yule-auth/authorship-db.json`. Класс заметки хранится во frontmatter файла.

---

## Диалог вставки

При вставке текста (≥ 5 слов с пунктуацией) появляется диалог с вопросом об авторстве. Галка «Отметить классом всю заметку» вместо разметки фрагмента задаёт класс заметке целиком. Диалог можно отключить до перезапуска Obsidian или насовсем.

---

## Автопометка

**По тегам:** если заметка содержит тег из настроенного списка, плагин автоматически выставляет ей класс авторства (без диалога).

**По свойству source:** если оно заполнено, автоматически добавляется авторство other.

---

## Оформление

Для каждого класса настраивается, на выбор:

- **Подсветка фрагментов** — цвет шрифта и подсветки шрифта
- **Текст** — градиент, курсив, подчёркивание, радужные буквы
- **Фон заметки** — цвет фона, левая полоса, свечение от полосы

---

## Файлы

| Файл | Назначение |
|---|---|
| `main.js` | Основной код |
| `styles.css` | Базовые стили (структура, модальные окна) |
| `manifest.json` | Метаданные плагина |
| `authorship-db.json` | База данных разметки (создаётся автоматически) |

---

## Установка

1. Скачайте `main.js`, `styles.css`, `manifest.json` из раздела Releases.
2. Поместите файлы в папку `.obsidian/plugins/yule-auth/`.
3. В настройках Obsidian включите плагин.

---

## Совместимость

Obsidian ≥ 1.4.0. Протестировано в Live Preview и Reading View.
