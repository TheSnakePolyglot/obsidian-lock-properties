import { Plugin, WorkspaceLeaf } from 'obsidian';

export default class PropertyEditorControlPlugin extends Plugin {
    private observer: MutationObserver | null = null;

    async onload() {
        console.log('Loading Property Editor Control Plugin');
        
        // Initialize the plugin
        this.initializePlugin();
        
        // Listen for layout changes (switching between modes)
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.handleModeChange();
            })
        );

        // Listen for active leaf changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.handleModeChange();
            })
        );
    }

    onunload() {
        console.log('Unloading Property Editor Control Plugin');
        this.cleanup();
    }

    private initializePlugin() {
        // Set up mutation observer to watch for DOM changes
        this.setupMutationObserver();
        
        // Initial check
        this.handleModeChange();
    }

    private setupMutationObserver() {
        // Clean up existing observer
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                // Check if nodes were added that might contain metadata properties
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (element.classList?.contains('metadata-container') || 
                                element.querySelector?.('.metadata-property-value')) {
                                shouldCheck = true;
                            }
                        }
                    });
                }
            });

            if (shouldCheck) {
                // Debounce the check to avoid excessive calls
                setTimeout(() => this.updatePropertyEditability(), 100);
            }
        });

        // Start observing
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private handleModeChange() {
        // Small delay to ensure DOM has updated after mode change
        setTimeout(() => {
            this.updatePropertyEditability();
        }, 50);
    }

    private updatePropertyEditability() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return;

        // Check if we're in reading mode
        const isReadingMode = this.isInReadingMode(activeLeaf);
        
        // Find all metadata property value elements
        const propertyElements = document.querySelectorAll('.metadata-property-value');
        
        propertyElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            
            if (isReadingMode) {
                // Disable editing in reading mode
                htmlElement.setAttribute('contenteditable', 'false');
                htmlElement.style.pointerEvents = 'none';
                htmlElement.style.opacity = '0.7';
            } else {
                // Enable editing in edit mode
                htmlElement.setAttribute('contenteditable', 'true');
                htmlElement.style.pointerEvents = 'auto';
                htmlElement.style.opacity = '1';
            }
        });

        console.log(`Updated ${propertyElements.length} property elements for ${isReadingMode ? 'reading' : 'edit'} mode`);
    }

    private isInReadingMode(leaf: WorkspaceLeaf): boolean {
        // Check the leaf's view state to determine if we're in reading mode
        const view = leaf.view;
        
        // For markdown files, check if we're in preview/reading mode
        if (view.getViewType() === 'markdown') {
            const state = leaf.getViewState();
            return state.state?.mode === 'preview';
        }
        
        // For other view types, we might want to consider them as "reading mode"
        // You can adjust this logic based on your needs
        return view.getViewType() !== 'markdown';
    }

    private cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Reset all property elements to default state
        const propertyElements = document.querySelectorAll('.metadata-property-value');
        propertyElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            htmlElement.setAttribute('contenteditable', 'true');
            htmlElement.style.pointerEvents = 'auto';
            htmlElement.style.opacity = '1';
        });
    }
}