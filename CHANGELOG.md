# Chessifier

## v0.2.0

### ✨ Features
- **Game Management**
  - Added support for **saving and reloading games**
  - Extended move format to support **glyphs, comments, and variants** (fully backward-compatible)
- **UI Enhancements**
  - Added **auto color scheme** support in theme settings
  - Added **filter option** to game search for easier navigation

### 🛠 Improvements & Refactors
- **Database**
  - Improved state management with a **persistent store**
  - Initialized `DatabaseViewStateContext` using `activeDatabaseViewStore`
- **Session & Auth**
  - Refactored session management and authentication logic for cleaner flow
- **Modals**
  - Simplified **confirmation modal** usage across app
  - Fixed `ImportModal` close behavior and added error handling
- **Codebase**
  - Reorganized folder and file structure for better modularity and maintainability
  - Renamed binary casing in `Cargo.toml` and `tauri.conf.json` for consistency

### 🐛 Fixes
- **Importing**
  - Fixed import modal functionality and hotkey behavior
- **Linux Support**
  - Added fallback to default document directory when **XDG is not configured**

### 📚 Documentation
- Added **Dockerfile** and setup instructions
- Updated `README` with supported platforms
- Included build instructions and updated formatting

### 🧹 Chores
- Added missing translations
- Updated project dependencies
- Updated app logo

## v0.1.0

### ✨ Features
- **Spotlight Search** for quick access
- **Personal Card Ratings Panel**
  - Added personal rating components
  - Improved overview and openings panels with filters
  - Fixed timezone ISO bug
  - Removed incorrect ELO averaging across rating systems
- **Translation Support**
  - Added **Armenian**
  - Completed **Russian**
- **File System**
  - Added directory and file creation checks in main logic
- **Accounts Page**
  - Improved account card UI and functionality
  - Edit account names
  - Restructured stats in a grid layout
  - Updated styling and layout
  - Improved progress tracking during game downloads
- **Settings Pages**
  - Restructured board and settings pages for better usability

### 🛠 Improvements & Refactors
- **Keybindings**
  - Renamed `keybinds` → `keybindings` across the codebase
  - Replaced `Ctrl` with `Mod` for cross-platform support
- **GameNotation**
  - Improved component structure and variation handling
- **Chess.com Integration**
  - Refactored stats retrieval and TCN decoding
  - Handled 404 errors gracefully in API responses
- **Report Creation**
  - Refactored logic and UI handling
- **Settings**
  - Adjusted BoardSelect component behavior
- **General**
  - Updated dependencies
  - Linted code and fixed build issues

### 🐛 Fixes
- **Performance**
  - Prevented event spam during frequent updates
  - Fixed infinite loop in `promoteToMainline`
- **UI Fixes**
  - Improved `SettingsPage` layout
  - Fixed PGN import and report progress bar
  - Fixed crash on multiple *View Solution* in puzzles
  - Improved puzzle caching and error handling
  - Fixed hotkeys and tab navigation on board
  - Fixed percentage calculation in `AccountCard` for zero games
  - Remembered report generation form state

### 📚 Documentation
- Improved `README` formatting
- Added build instructions
- Added `readme-updater` script for translation progress
