# ADN Improver

A comprehensive browser extension that enhances the ADN (Animation Digital Network) streaming experience with powerful features and improved usability.

## ✨ Features

### 🎭 Theater Mode
- **Wide Player Mode**: Expands the video player to use the full width of the screen
- **Auto-hiding Header**: Header slides away automatically and reappears on mouse hover
- **Optimized Layout**: Sidebar content moves below the player for better focus

### 🎮 Playback Controls
- **Speed Control**: Adjustable playback speeds (0.5x to 2x)
- **Picture-in-Picture**: Dedicated PiP button for multitasking
- **Double-Click Fullscreen**: Quick fullscreen toggle with double-click
- **Enhanced Fullscreen**: Improved fullscreen experience with better video rendering

### 🎨 UI Enhancements
- **Hide Thumbnails**: Blur episode thumbnails to avoid spoilers
- **Hide Scrollbar**: Clean interface without visible scrollbars
- **Hide Player Dim**: Remove modal overlays that dim the player
- **Hide Subtitles**: Toggle subtitle visibility
- **Watched Episodes**: Mark episodes as watched with visual indicators

### ⚙️ Settings Management
- **Backup & Restore**: Export and import your settings
- **Reset Options**: Restore default settings
- **Auto-Save**: Settings are automatically saved as you change them
- **Tabbed Interface**: Organized settings in easy-to-navigate tabs

## 🚀 Installation

### Manual/Development Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Heyimlulu/Improve-ADN.git
   cd Improve-ADN
   ```

2. **Install dependencies** (for building):
   ```bash
   npm install
   ```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer Mode" in the top right corner
   - Click "Load unpacked" and select the repository directory
   - The ADN Improver extension should now appear in your extensions list

### Building for Production

Build a distributable zip file:
```bash
npm run build
```

The built extension will be available in the `dist/` directory.

## 🏗️ Development

### Project Structure

```
Improve-ADN/
├── content/                 # Content scripts and styles
│   ├── content.js          # Main content script logic
│   ├── content.css         # Content styles and UI tweaks
│   └── theater.css         # Theater mode specific styles
├── popup/                  # Extension popup
│   ├── popup.html          # Popup interface
│   ├── popup.js            # Popup logic and settings management
│   └── popup.css           # Popup styling
├── icons/                  # Extension icons
├── shared/                 # Shared constants and utilities
│   └── constants.js        # Shared constants (for future use)
├── scripts/                # Build and utility scripts
│   └── version.js          # Version management script
├── manifest.json           # Extension manifest
├── build.js               # Production build script
└── package.json           # Node.js dependencies and scripts
```

### Architecture

The extension is built with a modular, class-based architecture:

- **Content Script**: Organized into handler classes for different features
- **Popup**: Separate managers for settings, tabs, and backup/restore
- **Build System**: Robust build script with validation and error handling
- **CSS**: Organized with custom properties and clear section divisions

### Version Management

Update version numbers across all files:
```bash
npm run version:patch    # 1.0.0 → 1.0.1
npm run version:minor    # 1.0.0 → 1.1.0
npm run version:major    # 1.0.0 → 2.0.0
```

## 🎯 Usage

1. **Install the extension** following the installation instructions above
2. **Visit ADN**: Navigate to https://animationdigitalnetwork.com
3. **Access Settings**: Click the extension icon in your browser toolbar
4. **Configure Features**: Enable/disable features in the organized tabs:
   - **General**: Theater mode
   - **Playback**: Speed control, PiP, fullscreen options
   - **UI**: Visual tweaks and hiding options
   - **Manage**: Backup, restore, and reset settings

## 🔧 Technical Details

### Browser Compatibility
- **Chrome**: Full support (Manifest V3)
- **Edge**: Full support (Chromium-based)
- **Firefox**: Compatible with minor adaptations

### Permissions
- `storage`: For saving user preferences and watched episodes
- `host_permissions`: Access to animationdigitalnetwork.com

### Performance
- **Lazy Loading**: Features are initialized only when needed
- **Event Cleanup**: Proper cleanup of event listeners and observers
- **Efficient DOM**: Minimal DOM manipulation with targeted selectors
- **CSS Variables**: Consistent theming and easy customization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes following the existing code style
4. Test thoroughly on ADN
5. Commit with clear messages: `git commit -m "Add feature description"`
6. Push to your fork: `git push origin feature-name`
7. Create a Pull Request

### Code Style
- Use ES6+ features and modern JavaScript
- Follow the existing class-based architecture
- Add JSDoc comments for public methods
- Use CSS custom properties for theming
- Organize CSS with clear section comments

## 📝 Changelog

### Version 1.0.0
- ✨ Complete refactor and code cleanup
- 🎭 Enhanced theater mode with auto-hiding header
- 🎮 Improved playback controls with better error handling
- 🎨 Enhanced fullscreen mode with better video rendering
- ⚙️ Robust settings management with backup/restore
- 🏗️ Modular class-based architecture
- 🎯 Better CSS organization with custom properties
- 📦 Improved build system with validation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- ADN (Animation Digital Network) for providing the streaming platform
- The browser extension development community for best practices and patterns

---

**Note**: This extension is not officially affiliated with Animation Digital Network. It's a community-driven project to enhance the user experience.