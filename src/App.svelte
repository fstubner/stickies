<script lang="ts">
  import { onMount } from 'svelte';
  import { Router, Route } from 'svelte-routing';
  import AppShell from './components/layout/AppShell.svelte';
  import StickyNote from './components/notes/StickyNote.svelte';
  import Onboarding from './views/Onboarding.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import ToastContainer from './components/ui/ToastContainer.svelte';
  import { electronService } from './services/electronService';
  import { noteService } from './services/noteService';
  import { loadSettings, settings, applyTheme, needsOnboarding, completeOnboarding } from './stores/settings';
  import { loadNotes, getNoteById } from './stores/notes';
  import { updateOpenStickyWindows } from './stores/stickyWindows';

  // Base URL for routing
  export let url = '';

  // Check if this is a sticky window (bypass onboarding and heavy loading)
  const isStickyWindow = typeof window !== 'undefined' && window.location.pathname.startsWith('/sticky/');

  let showOnboarding = false;
  let isLoading = !isStickyWindow; // Sticky windows skip loading screen

  // Apply theme when settings change
  settings.subscribe(value => {
    applyTheme(value.theme);
  });

  onMount(async () => {
    // Load settings (always needed for theme)
    await loadSettings();

    // For sticky windows, skip onboarding and heavy loading
    if (isStickyWindow) {
      isLoading = false;
      return;
    }

    // Check if onboarding is needed (only for main window)
    showOnboarding = needsOnboarding();

    // Load notes (only for main window)
    await loadNotes();

    isLoading = false;

    // Set up listener for creating new notes (only for main window)
    if (typeof window.electron !== 'undefined') {
      electronService.onCreateNewNote(() => {
        noteService.createStickyNote();
      });
      window.electron.onNavigateToNote((noteId) => {
        // Navigate to dashboard
        if (window.location.pathname !== '/') {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        // TODO: Highlight note or scroll to it using a store or event
        // For now just ensuring we are in the main view
        console.log('Navigating to note:', noteId);
      });

      // Listen for sticky window updates
      window.electron.onStickyWindowsUpdate((ids) => {
        updateOpenStickyWindows(ids);
      });
    }
  });

  async function handleOnboardingComplete() {
    await completeOnboarding();
    showOnboarding = false;
  }

  function handleNoteClick(e: CustomEvent<{ noteId: string }>) {
    // Open note or navigate to it
    const note = getNoteById(e.detail.noteId);
    if (note) {
      noteService.openAsSticky(note);
    }
  }
</script>

{#if isLoading}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <p>Loading...</p>
  </div>
{:else if showOnboarding}
  <Onboarding on:complete={handleOnboardingComplete} />
{:else}
  <Router {url}>
    <Route path="sticky/:id" let:params>
      <StickyNote noteId={params.id} />
    </Route>
    <Route path="/settings">
      <AppShell mode="settings" on:noteClick={handleNoteClick}>
        <SettingsView />
      </AppShell>
    </Route>
    <Route path="/*">
      <AppShell on:noteClick={handleNoteClick} />
    </Route>
  </Router>
{/if}

<!-- Global Toast Container -->
<ToastContainer />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-4);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-screen p {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }
</style>
