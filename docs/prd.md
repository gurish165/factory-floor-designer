# Factory Floor Designer Application PRD

## Overview
Factory Floor Designer is a web application that helps users design their factory floor by creating layout designs with a grid and 3D objects in a Clash of Clans style. The application runs entirely client-side and can be deployed on GitHub Pages, making it easily accessible without backend dependencies. The application is optimized for both desktop and mobile browsers in landscape orientation, featuring collapsible sidebars and modals that can be revealed as needed to maximize the main viewport area without occluding the crucial design space. In this PRD machines and "objects" are interchangeable. 

## Technical Stack
For state management, Zustand is the preferred library due to its simplicity and performance. The engineering team is encouraged to utilize Lucide icons throughout the application for a consistent visual language. Three.js should be implemented for all 3D rendering requirements. Data persistence will rely on local browser storage to maintain user designs across sessions without requiring authentication or remote storage. CSS should all be done with tailwinds, and should only have tones of black and white, no blue.

## Code Organization
The engineer has flexibility in organizing the codebase, but should adhere to best front-end design practices. The project structure should consider eventual deployment to GitHub Pages, ensuring that all necessary build configurations are properly set up. Throughout the application, comprehensive logging should be implemented for all operations to facilitate debugging and future maintenance. While specific organizational patterns aren't mandated, the code should be structured in a way that promotes readability and maintainability.

## Core Application Layout

### Main Viewport
The main viewport displays a Clash of Clans style perspective grid with a fixed isometric view set at a 60-degree angle (where 90 degrees would be looking directly top-down at the canvas). This grid spans 5000 x 5000 units, providing ample space for even the most complex factory designs. The grid lines should be styled in a light gray color, with each cell on the canvas filled with black to create clear visual boundaries.

A critical aspect of the grid is the coordinate system visibility. The coordinate numbers must always be visible on the edges of the grid to help users orient themselves. When fully zoomed out, the grid should display numbers from 0 to 5000 in increments of 250, resulting in 20 labels per side. As users zoom in, the labeling system should maintain its clarity, with the maximum zoom level showing a 20x20 grid where each line is individually labeled from 1 to 20. This consistent labeling approach applies to both the birds-eye and isometric views, ensuring users always understand their position within the vast grid space.

### View Toggle
It is important the view is in isometric style and not perspective.
Located on the top right of the interface is a toggle button that allows users to switch between the default isometric view and a top-down 2D view (birds-eye perspective). When users click this button, the application should immediately re-render the canvas in the new perspective without any transitional animations. Both viewing modes must display all objects placed on the grid, though their visual representation will differ based on the perspective. In the isometric view, objects appear in their full 3D glory, while the birds-eye view presents only the top-down face of each 3D model. Both views adhere to the same zoom and pan mechanics, maintaining consistency in the user experience regardless of the chosen perspective.

### Navigation Controls
The application provides intuitive navigation controls similar to those found in Clash of Clans. Users can zoom in and out using the mouse wheel on desktop or pinch gestures on mobile devices. Panning across the grid is achieved by clicking and dragging on desktop or using a single finger swipe on mobile. 

An important distinction in the mobile experience is that panning with one finger should never accidentally select objects on the grid. Object selection should only occur through a deliberate click and release action, which will then reveal the interactive check/X bubbles above the object and enable the user to move the object to a different location on the canvas. This careful separation of navigation and selection gestures ensures a frustration-free mobile experience.

## Object Management

### Object Library
Users access the object library by clicking a factory icon button positioned in the bottom right corner of the main viewport. This action navigates the user to a dedicated page displaying a grid of all available objects/machines, temporarily removing the main grid from view.

Each machine is represented by a "card" that contains comprehensive information: the machine's name at the top, its XY dimensions written in a slightly smaller font underneath, and an isometric view of the object that fills most of the card space. At the bottom of each card are three interactive buttons: Import (to place the object on the grid), Duplicate (to create a copy of the object), and Delete (to remove the object from the library). This layout ensures users have all necessary information and actions available at a glance.

### Default Objects
The application comes pre-populated with two default objects to help users get started quickly. The first is a "Mill" with dimensions of 4 x 4 x 8 units (xyz), and the second is a "Wall" with dimensions of 2 x 1 x 1 units (xyz). These default objects function identically to user-created objects and can be deleted, duplicated, or imported to the canvas grid as needed. They serve as examples of the application's capabilities and provide immediate utility for users beginning their first factory design.

### Object Creation
The first card in the object library displays a prominent "+" sign, which serves as the entry point for creating new objects. When clicked, this card opens a modal dialog for object creation. The modal presents an input field for naming the object at the top, followed by a non-interactive preview of the 3D model in the center section. Below the preview, users can specify the XYZ dimensions and select a color using a standard React color selector tool. A clearly visible "X" button in the top right corner allows users to close or cancel the creation process.

The dimensions entered by users must adhere to certain constraints: they cannot be negative values, must be integers (no fractional units), and cannot exceed the maximum dimensions of 500 x 500 x 100 units. These limitations ensure that objects remain manageable within the grid system and prevent performance issues that might arise from excessively large objects.

### 3D Model Design
Each object in the application follows a specific design approach consisting of two distinct parts. First, a thin base with exactly 0.5 units of thickness serves as the foundation, with its length and width matching the XY dimensions specified by the user. On top of this base sits a second block that is 0.2 units smaller in both length and width than the base, creating a subtle lip around the edge. This top block accounts for the remaining height in the Z dimension.

For example, if a user creates a machine with dimensions of 4 x 6 x 8 units (xyz), the resulting 3D model would have a base measuring 4 x 6 x 0.5 units at the bottom, with a top block measuring 3.8 x 5.8 x 7.5 units centered on the base. All edges running along the Z axis (vertically) should be filleted to create a more polished appearance. This consistent approach to 3D modeling ensures visual harmony across all objects in the factory design.

### Object Placement
When a user selects an object to import from the library, they are automatically returned to the main viewport where they were last working (either in isometric or birds-eye view, depending on what was active). The selected object appears in the center of the canvas, aligned with the XY grid and ready for placement.

During the placement process, visual feedback helps users understand valid positioning. The object glows green when it can be placed in its current location or red if the space is already occupied by another object. Above the object, two interactive buttons appear: a green check mark to confirm placement and a red X to cancel. Below the object, a rotation icon allows users to rotate the object in 90-degree increments. When placement would be invalid (indicated by the red glow), the green check mark becomes grayed out to prevent confirmation.

In the birds-eye view, this process works identically, except that users see only the top-down face of the 3D model rather than its full volumetric representation. This consistent behavior between views helps users quickly adapt to either perspective.

The placement system enforces strict collision detection where objects cannot overlap even partially—they must have completely free space available. Additionally, the application implements mandatory snap-to-grid functionality, ensuring that objects can only be placed at integer coordinates on the grid. This grid-snapping behavior, combined with the requirement that object dimensions must also be integers, creates a predictable and orderly layout system.

### Object Manipulation
After initial placement, objects can be manipulated in several ways. Users can select and drag objects to new positions, similar to the interaction model in Clash of Clans. During repositioning, the same placement rules apply—objects glow green or red to indicate valid or invalid positions, and the check/X confirmation controls appear.

Objects can be rotated in 90-degree increments during both initial placement and repositioning, allowing users to optimize their layout for space efficiency or process flow. However, to maintain simplicity and avoid complications with placed objects, objects cannot be edited after creation. Instead, users can delete unwanted objects, duplicate existing ones to create new objects with identical properties, or import the same object multiple times onto the grid.

The application intentionally does not include undo/redo functionality, encouraging users to be deliberate in their design decisions. This approach simplifies the state management requirements while still providing sufficient flexibility through the available manipulation options.

## Floorplan Management

### Left Panel
A button positioned at the top left of the interface opens the left panel, which serves as the floorplan management center. This panel is collapsible and overlays the main viewport when open, sliding in and out with a basic animation when toggled.

At the top of the left panel sits a "+" button that initiates the creation of a new floor plan. Below this button is a scrollable list of all saved floor plans, allowing users to manage multiple designs simultaneously. The currently active floor plan is visually highlighted to prevent confusion when switching between different designs.

### Floor Plan Creation
When users click the "+" button in the left panel, a modal dialog appears with options for creating a new floor plan. This modal contains a field for naming the floor plan, a "Start new" button to begin with an empty grid, and an "Upload" button accompanied by an empty box where users can drop a JSON file to import an existing design.

After the user confirms their choice, the new floor plan name appears in the left panel's list and is automatically highlighted to indicate it's now the active design. For newly created floor plans, the main viewport displays an empty grid ready for object placement. For imported designs, the grid populates with the objects specified in the imported JSON file.

### Floor Plan Management
Each floor plan entry in the left panel's list features two icons for management actions. An edit icon allows users to change the name of the floor plan (but not its contents, which must be modified directly in the main viewport). An export icon enables users to export the entire design as a JSON file that can be shared or imported later.

Users can switch between different floor plans by selecting them from the list. When a different floor plan is selected, the application loads its content into the main viewport, replacing the previously displayed design. This switching mechanism allows users to work on multiple layouts without losing their progress.

## Data Management

### Storage
The application uses local browser storage to persist user data between sessions, ensuring that designs remain available even after the user closes the browser or refreshes the page. No specific size limit is enforced, though the application should log errors to the console if the browser's storage capacity is reached.

An auto-save feature is encouraged to prevent data loss, automatically storing changes as users modify their designs. This approach eliminates the need for manual saving and reduces the risk of losing work in progress. The storage system should be implemented to allow clearing via standard browser mechanisms (clearing browser storage), giving users control over their data when needed.

### JSON Export/Import
The JSON export functionality creates a comprehensive representation of the user's design. This includes detailed information about all objects (their dimensions, colors, names, and other properties) as well as layout information detailing the position and rotation of each object on the grid.

The import process follows a three-step approach. First, the application validates the imported JSON against the expected schema to ensure it contains all required data in the correct format. Next, it creates the objects specified in the JSON, adding them to the user's object library. Finally, it places these objects on a new floorplan according to the positional data in the JSON.

The imported objects appear in the user's object/machine library for potential reuse in other designs, while the imported floorplan appears as a new entry in the left sidebar. No size limit is imposed on imports, allowing for complex designs to be shared freely.

When handling potential conflicts during import, the application follows specific rules. If an object with the same name already exists in the user's library, the application does not overwrite it but instead shows the name conflicts on the import modal to inform the user. During floorplan construction, any conflicting objects are simply skipped without notifying the user, ensuring the import process continues even if some objects cannot be placed.

## Mobile Optimization

### Responsive Design
The application is designed to support all mobile browsers, with a minimum supported size equivalent to the iPhone 10. The core UI functions identically across desktop and mobile platforms, ensuring a consistent experience regardless of device. However, to accommodate the smaller screen real estate on mobile devices, buttons that overlay the canvas and sidebar are slightly reduced in size to prevent excessive occlusion of the design space.

Mobile-specific gesture support is fully implemented, including pinch-to-zoom functionality and single-finger panning that doesn't trigger accidental object selection. These touch interactions mirror the desktop experience while respecting the conventions and limitations of touchscreen devices.

### UI Elements
The interface features strategically positioned buttons to show and hide sidebars, allowing users to maximize their viewport when needed. All UI elements are designed to avoid unnecessary occlusion of the main viewport, particularly important on smaller mobile screens where space is at a premium.

The application maintains feature parity between mobile and desktop experiences, ensuring that mobile users can access all functionality without compromise. This approach recognizes that many users may switch between devices or prefer to work exclusively on mobile, particularly for quick adjustments or reviews while away from their desktop.

## UI/UX Details

### Design Style
The entire application adheres to a very dark mode color scheme with an Apple-like /shadcn UI style, creating a modern, professional appearance tha engineering team has discretion in selecting appropriate UI component libraries to achieve this aesthetic, provided they maintain consistency throughout the application.

For color selection of objects, the application implements a basic React color selector tool that gives users adequate choice while keeping the interface simple and intuitive. This straightforward approach to color selection aligns with the overall goal of making the application accessible to users regardless of their design expertise.

### Sidebars & Modals
All sidebars and modals in the application feature basic slide in/out animations that provide visual feedback without feeling sluggish or distracting. These elements overlay the main viewport rather than pushing it aside, maximizing the available space for the design grid when they're not in use.

Every modal includes a clearly visible X button in the top right corner, providing a consistent method for closing or canceling operations. This predictable behavior helps users quickly learn the application's interaction patterns and reduces potential confusion when switching between different tasks.

### Error Handling
The application implements comprehensive error logging to the console, capturing issues that might arise during object placement, data storage, or import/export operations. All significant operations include logging statements that help trace application flow and identify potential problems.

Beyond technical logging, the application provides visual feedback when operations fail, such as highlighting invalid placement positions in red or disabling confirmation buttons when actions cannot be completed. This immediate feedback helps users understand what's happening and correct issues without needing to consult error logs or documentation.

## Performance
While optimization is not a primary consideration at this initial stage of development, the application should maintain reasonable performance on standard hardware. The engineering team can focus on implementing features correctly before addressing potential performance optimizations in future iterations.

## Implementation Notes
The application intentionally omits editing functionality for existing objects/machines to avoid complications with objects/achines that are already placed on the grid. This design decision simplifies both the user experience and the underlying implementation while still providing flexibility through the duplicate and delete options.

The coordinate system must be consistently applied across all views, ensuring that objects appear in the correct positions regardless of the selected perspective. This consistency is crucial for users who frequently switch between isometric and birds-eye views during their design process.

The mobile experience should match the desktop functionality while accommodating touch controls, recognizing that many users may prefer to design their factory layouts while on the go or directly on the factory floor using a tablet or smartphone. This mobile-first thinking ensures the application remains useful in a variety of contexts.