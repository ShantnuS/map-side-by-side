# Map<span style="color:#f97316">Side</span>By<span style="color:#3b82f6">Side</span>

A modern, interactive web application for comparing geographic shapes and sizes across different locations on Earth. Draw polygons on one map and see them accurately mirrored on another location to understand true scale and size relationships.

## 🌍 Overview

MapSideBySide is an open-source project inspired by [MapFrappe](https://mapfrappe.com/), built with modern web technologies to provide an intuitive way to compare geographic areas. Whether you're an educator, researcher, or just curious about how different places compare in size, this tool makes geographic scale comparison accessible and engaging.

### ✨ Key Features

- **📐 Interactive Drawing**: Draw polygons, rectangles, and other shapes on the left map
- **🔄 Real-time Mirroring**: Automatically displays your shapes on the right map with accurate geographic scaling
- **🎯 Rotation Controls**: Rotate shapes to see how orientation affects perception
- **🗺️ Multiple Map Modes**: Street view, satellite imagery, and hybrid mode with labels
- **🔍 Location Search**: Search for any location worldwide with automatic map navigation
- **💾 Persistent Settings**: Your preferences are saved between sessions
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

### 🛠️ Technology Stack

- **React 18** - Modern component-based UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Leaflet** - Interactive mapping library
- **Turf.js** - Geospatial analysis and calculations
- **OpenStreetMap** - Street map tiles
- **Esri World Imagery** - Satellite imagery

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/map-side-by-side.git
   cd map-side-by-side
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application running.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## 📖 Usage

1. **Drawing Shapes**: Use the polygon tool on the left map to draw your shape
2. **Location Search**: Use the search bar to navigate to different locations
3. **Map Selection**: Toggle between "Left" and "Right" in the search controls to choose which map to navigate
4. **Rotation**: Use the rotation slider to rotate your shape and see how it affects the mirrored version
5. **Map Modes**: Switch between Street, Satellite, and Hybrid views using the dropdown in each map's corner

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

- Use the GitHub Issues tab to report bugs or suggest features
- Provide clear descriptions and steps to reproduce issues
- Include screenshots when helpful

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style and conventions
   - Add TypeScript types for new functionality
   - Test your changes thoroughly
4. **Commit your changes**
   ```bash
   git commit -m "Add: your feature description"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Use meaningful commit messages

## 📚 Third-Party Libraries

This project builds upon several excellent open-source libraries:

- **[Leaflet](https://leafletjs.com/)** - Open-source JavaScript library for mobile-friendly interactive maps
- **[Turf.js](https://turfjs.org/)** - Advanced geospatial analysis for browsers and Node.js
- **[React](https://reactjs.org/)** - A JavaScript library for building user interfaces
- **[TypeScript](https://www.typescriptlang.com/)** - Typed superset of JavaScript
- **[Vite](https://vitejs.dev/)** - Next generation frontend tooling
- **[Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)** - Vector drawing and editing plugin for Leaflet

### Map Data Sources

- **[OpenStreetMap](https://www.openstreetmap.org/)** - Free, editable map of the world
- **[Esri World Imagery](https://www.esri.com/)** - High-resolution satellite and aerial imagery
- **[Nominatim](https://nominatim.org/)** - Search engine for OpenStreetMap data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [MapFrappe](https://mapfrappe.com/) - the original tool for true size comparisons
- Thanks to the OpenStreetMap community for providing free geographic data
- Built with love for geography enthusiasts, educators, and curious minds worldwide

## 🌟 Star History

If you find this project useful, please consider giving it a star on GitHub!

---

**Made with 🗺️ for geographic education and exploration**
