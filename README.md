# Stickies

A cross-platform desktop application for creating and managing sticky notes, built with Svelte and Electron.

## Features

- Create and manage sticky notes that persist across app restarts
- Pin sticky notes to always be on top of other applications
- Drag notes to any position on your screen
- Customize note colors and content
- Simple, intuitive interface with modern UI options
- Local storage for all notes
- System tray support for quick access
- Cross-platform support (Windows, macOS, Linux)

## Tech Stack

- **Frontend**: Svelte with TypeScript
- **UI Framework**: Options include:
  - Native CSS styling (current implementation)
  - [Skeleton UI](https://www.skeleton.dev/) - Optional enhancement
  - [shadcn-svelte](https://www.shadcn-svelte.com/) - Optional enhancement
- **Desktop**: Electron
- **Build Tools**: Vite

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/fstubner/stickies.git
   cd stickies
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or if using pnpm:
   ```
   pnpm install
   ```

### Development

To run the app in development mode:

```
npm run dev
```

This will start both the Vite dev server for Svelte and the Electron process.

### UI Framework Integration (Optional)

#### To add Skeleton UI:

```bash
npm i @skeletonlabs/skeleton @skeletonlabs/tw-plugin @tailwindcss/forms
npx svelte-add@latest tailwindcss
```

Then update your `tailwind.config.js` as shown in the Skeleton UI cheatsheet.

#### To add shadcn-svelte:

```bash
npx shadcn-svelte@latest init
```

Follow the prompts to set up your project configuration.

### Building

To build the application:

```
npm run build
```

This will create a production-ready build in the `dist` directory.

## Project Structure

- `electron/` - Electron main process code
  - `main.js` - Main Electron process
  - `preload.js` - Preload script for secure renderer access
- `src/` - Svelte application code
  - `components/` - Reusable UI components
    - `NoteCard.svelte` - Card component for notes in the dashboard
    - `StickyNote.svelte` - Standalone sticky note component
  - `views/` - Main application views
    - `Dashboard.svelte` - Main view with all notes
  - `electron.d.ts` - TypeScript definitions for Electron
  - `App.svelte` - Main application component
  - `main.ts` - Application entry point
- `public/` - Static assets
- `cheatsheets/` - Development reference materials

## Resources

The project includes several cheatsheets for reference:
- `cheatsheets/svelte-cheatsheet.md` - Svelte syntax and patterns
- `cheatsheets/electron-cheatsheet.md` - Electron development guide
- `cheatsheets/skeleton-ui-cheatsheet.md` - Skeleton UI components (if using)
- `cheatsheets/typescript-cheatsheet.md` - TypeScript reference

## License

MIT