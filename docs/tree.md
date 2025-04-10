├── README.md
├── docs
│   ├── implementation.md
│   └── prd.md
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── src
│   ├── App.tsx             # Main application component with routing
│   ├── components
│   │   ├── Canvas.tsx      # Main viewport with isometric/birds-eye grid
│   │   ├── LeftPanel.tsx   # Collapsible floorplan management panel
│   │   ├── LibraryButton.tsx  # Button to navigate to object library
│   │   ├── ObjectCreationModal.tsx  # Modal for creating new objects
│   │   ├── ObjectLibrary.tsx  # Page for viewing/managing objects
│   │   ├── ObjectModel.tsx  # 3D model component for objects
│   │   └── ViewToggle.tsx   # Toggle between isometric/birds-eye views
│   ├── index.css
│   ├── index.tsx
│   ├── react-app-env.d.ts
│   └── store
│       ├── floorplanStore.ts  # Zustand store for floorplan management
│       ├── objectStore.ts     # Zustand store for object library
│       ├── placementStore.ts  # Zustand store for object placement
│       └── viewStore.ts       # Zustand store for view state
├── tailwind.config.js
└── tsconfig.json

4 directories, 18 files