# Factory Floor Designer

A web application for designing factory floor layouts with a 3D isometric grid and object placement.

## Features

- 5000x5000 unit isometric grid with coordinate labels
- Toggle between isometric (60-degree) and birds-eye (top-down) views
- Zoom and pan controls for easy navigation
- Object library with default "Mill" and "Wall" objects
- Create custom objects with specific dimensions and colors
- Place, rotate, and arrange objects on the grid
- Save and manage multiple floorplans
- Export and import floorplans as JSON
- Mobile-responsive design

## Technologies Used

- React (Create React App)
- TypeScript
- Three.js for 3D rendering
- Zustand for state management
- Tailwind CSS for styling
- React Router for navigation
- Lucide React for icons
- React-Colorful for color picking

## Getting Started

### Prerequisites

- Node.js (version 14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/gurish165/factory-floor-designer.git
   cd factory-floor-designer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Usage

### Canvas View
- Use the mouse wheel or pinch gestures to zoom in/out
- Click and drag (or swipe on mobile) to pan around the grid
- Click the eye icon in the top-right to toggle between isometric and birds-eye views
- Click the factory icon in the bottom-right to access the object library

### Object Library
- Click the "+" card to create a new object
- Specify name, dimensions, and color for new objects
- Use the Import button to place an object on the grid
- Use the Duplicate button to create a copy of an object
- Use the Delete button to remove an object from the library

### Object Placement
- When placing an object, it will appear at your mouse/touch position
- Green glow indicates a valid placement, red indicates invalid
- Use the rotation button to rotate the object in 90-degree increments
- Click the check mark to confirm placement or X to cancel

### Floorplan Management
- Click the menu icon in the top-left to open the floorplan panel
- Use the "+" button to create a new floorplan or import an existing one
- Click a floorplan name to switch to that layout
- Use the edit icon to rename a floorplan
- Use the download icon to export a floorplan as JSON

## License

This project is licensed under the MIT License.

## Acknowledgments

- Design inspired by Clash of Clans building placement UI
- Documentation based on the implementation steps from the PRD
