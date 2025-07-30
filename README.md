<br />
<div align="center">
<a href="https://github.com/Chessifier/chessifier">
    <img width="115" height="115" src="https://github.com/Chessifier/chessifier/raw/main/src-tauri/icons/icon.png" alt="Logo">
</a>

<h3 align="center">Chessifier</h3>

<p align="center">
    The Ultimate Chess Toolkit
    <br />
    <br />
    <a href="https://chessifier.github.io/">Website</a>
    ·
    <a href="https://discord.gg/8hk49G8ZbX">Discord Server</a>
    ·
    <a href="https://github.com/Chessifier/chessifier/releases">Releases</a>
</p>
</div>

Chessifier is a modern, open-source, cross-platform chess GUI built for power users and enthusiasts. Designed to be intuitive, customizable, and feature-rich, it provides a seamless experience for analyzing games, training repertoires, and managing engines and databases.

## ✨ Features

- 🔍 Game Analysis - Import and analyze games from [lichess.org](https://lichess.org) and [chess.com](https://chess.com).
- ⚙️ Multi-Engine Support - Analyze with any UCI-compatible engine.
- 🧠 Repertoire Training - Build and train your opening repertoire using spaced repetition.
- 📦 Engine & Database Management - Install and manage engines and databases with minimal effort.
- 🔎 Position Search - Search for absolute or partial positions across your game database.

## 🚀 Getting Started

### Prerequisites
Ensure you have the required tools installed for your platform:
- [Tauri prerequisites](https://tauri.app/start/prerequisites/)
- [pnpm package manager](https://pnpm.io/)

### Build Instructions

1. **Clone the repository**:

   ```bash
   git clone git@github.com:Chessifier/chessifier.git
   cd chessifier
   ```

2. **Install dependencies using pnpm**:

   ```bash
   pnpm install
   ```

3. **Run in Development Mode**:

    Build and run the desktop application using Tauri:

    ```bash
    pnpm tauri dev
    ```

4. **Build for Production**:

    Build the application for production:

    ```bash
    pnpm tauri build
    ```

    The compiled application will be available at:

    ```bash
    src-tauri/target/release
    ```

## 🌍 Translations

<!-- TRANSLATIONS_START -->
| Language  | Status   | File                        |
|-----------|----------|-----------------------------|
| 🇺🇸 US | ✅ 100% | [US](./src/translation/en_US.ts) |
| 🇦🇲 AM | 🟡 97% | [AM](./src/translation/am_AM.ts) |
| 🇧🇾 BY | 🟡 88% | [BY](./src/translation/be_BY.ts) |
| 🇩🇪 DE | 🟡 88% | [DE](./src/translation/de_DE.ts) |
| 🇪🇸 ES | 🟡 88% | [ES](./src/translation/es_ES.ts) |
| 🇫🇷 FR | 🟡 97% | [FR](./src/translation/fr_FR.ts) |
| 🇮🇹 IT | 🟡 88% | [IT](./src/translation/it_IT.ts) |
| 🇳🇴 NO | 🟡 88% | [NO](./src/translation/nb_NO.ts) |
| 🇵🇱 PL | 🟡 88% | [PL](./src/translation/pl_PL.ts) |
| 🇵🇹 PT | 🟡 88% | [PT](./src/translation/pt_PT.ts) |
| 🇷🇺 RU | 🟡 98% | [RU](./src/translation/ru_RU.ts) |
| 🇹🇷 TR | 🟡 88% | [TR](./src/translation/tr_TR.ts) |
| 🇺🇦 UA | 🟡 88% | [UA](./src/translation/uk_UA.ts) |
| 🇨🇳 CN | 🟡 88% | [CN](./src/translation/zh_CN.ts) |
<!-- TRANSLATIONS_END -->

📢 Want to help translate? See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📦 Changelog

For a list of recent changes, see the [Changelog](./CHANGELOG.md).

## 🤝 Contributing

We welcome contributions! Please refer to the [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

## 💬 Community

Join our [Discord server](https://discord.gg/8hk49G8ZbX) to connect with other users, get help, and contribute to discussions.

## 🧱 About This Project

Chessifier is a fork of [En Croissant](https://github.com/franciscoBSalgueiro/en-croissant), extended with additional features, refinements, and a focus on user experience.

