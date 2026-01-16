/**
 * Block-to-PNG Injection Script v1.0
 * Enables elegant block selection and PNG export on any webpage
 */

(function() {
    'use strict';

    // Prevent double injection
    if (window.blockToPngActive) {
        console.log('✅ Block-to-PNG already active');
        return;
    }

    // Configuration
    const CONFIG = {
        highlightColor: '#6366f1',
        highlightOpacity: '0.08',
        outlineWidth: '2px',
        scale: 2,
        backgroundColor: '#ffffff',
        padding: 24,
        selectors: ['pre', 'code', 'article', 'section', 'div']
    };

    // State management
    let state = {
        isActive: false,
        currentHovered: null,
        overlay: null,
        tooltip: null,
        originalStyles: new Map()
    };

    /**
     * Load html2canvas library dynamically
     */
    function loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            if (window.html2canvas) {
                resolve(window.html2canvas);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => resolve(window.html2canvas);
            script.onerror = () => reject(new Error('Failed to load html2canvas'));
            document.head.appendChild(script);
        });
    }

    /**
     * Create overlay with modern design
     */
    function createOverlay() {
        state.overlay = document.createElement('div');
        state.overlay.id = 'block-to-png-overlay';
        state.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.02);
            z-index: 999998;
            cursor: crosshair;
            backdrop-filter: blur(1px);
        `;
        document.body.appendChild(state.overlay);
    }

    /**
     * Create modern tooltip
     */
    function createTooltip() {
        state.tooltip = document.createElement('div');
        state.tooltip.id = 'block-to-png-tooltip';
        state.tooltip.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 1000000;
            pointer-events: none;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
            display: none;
            white-space: nowrap;
            transition: all 0.2s ease;
        `;
        state.tooltip.textContent = '📸 Click to export · Esc to cancel';
        document.body.appendChild(state.tooltip);
    }

    /**
     * Get selectable elements with intelligent filtering
     */
    function getSelectableElements() {
        const elements = [];
        
        for (const selector of CONFIG.selectors) {
            const found = document.querySelectorAll(selector);
            found.forEach(el => {
                // Skip our own UI elements
                if (el.id && el.id.startsWith('block-to-png-')) return;
                
                // Skip tiny elements
                const rect = el.getBoundingClientRect();
                if (rect.width < 50 || rect.height < 20) return;
                
                // Skip hidden elements
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
                if (el.offsetParent === null) return;
                
                elements.push({
                    element: el,
                    priority: CONFIG.selectors.indexOf(selector),
                    size: rect.width * rect.height
                });
            });
        }
        
        return elements;
    }

    /**
     * Find best element at cursor position
     */
    function findElementAtPoint(x, y) {
        const candidates = getSelectableElements();
        const hits = candidates.filter(({ element }) => {
            const rect = element.getBoundingClientRect();
            return x >= rect.left && x <= rect.right &&
                   y >= rect.top && y <= rect.bottom;
        });

        if (hits.length === 0) return null;

        // Sort by priority, then by size (smaller/more specific is better)
        hits.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.size - b.size;
        });

        return hits[0].element;
    }

    /**
     * Highlight element with modern styling
     */
    function highlightElement(element) {
        if (state.currentHovered === element) return;
        
        // Remove previous highlight
        if (state.currentHovered) {
            const savedStyle = state.originalStyles.get(state.currentHovered);
            if (savedStyle) {
                state.currentHovered.style.outline = savedStyle.outline;
                state.currentHovered.style.backgroundColor = savedStyle.backgroundColor;
                state.currentHovered.style.cursor = savedStyle.cursor;
                state.currentHovered.style.boxShadow = savedStyle.boxShadow;
            }
        }

        state.currentHovered = element;

        if (element) {
            // Save original styles
            state.originalStyles.set(element, {
                outline: element.style.outline,
                backgroundColor: element.style.backgroundColor,
                cursor: element.style.cursor,
                boxShadow: element.style.boxShadow
            });

            // Apply highlight
            element.style.outline = `${CONFIG.outlineWidth} solid ${CONFIG.highlightColor}`;
            element.style.backgroundColor = `rgba(99, 102, 241, ${CONFIG.highlightOpacity})`;
            element.style.cursor = 'pointer';
            element.style.boxShadow = `0 0 0 4px rgba(99, 102, 241, 0.1)`;
            state.tooltip.style.display = 'block';
        } else {
            state.tooltip.style.display = 'none';
        }
    }

    /**
     * Handle mouse movement
     */
    function handleMouseMove(e) {
        if (!state.isActive) return;

        const element = findElementAtPoint(e.clientX, e.clientY);
        highlightElement(element);

        // Position tooltip near cursor
        if (element) {
            const tooltipRect = state.tooltip.getBoundingClientRect();
            let left = e.clientX + 20;
            let top = e.clientY + 20;

            // Keep tooltip on screen
            if (left + tooltipRect.width > window.innerWidth) {
                left = e.clientX - tooltipRect.width - 20;
            }
            if (top + tooltipRect.height > window.innerHeight) {
                top = e.clientY - tooltipRect.height - 20;
            }

            state.tooltip.style.left = left + 'px';
            state.tooltip.style.top = top + 'px';
        }
    }

    /**
     * Export element to high-quality PNG
     */
    async function exportToPNG(element) {
        try {
            // Update tooltip
            state.tooltip.textContent = '⏳ Rendering...';
            state.tooltip.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)';
            state.tooltip.style.display = 'block';

            // Clone element
            const clone = element.cloneNode(true);
            
            // Reset any inline styles from highlighting
            clone.style.outline = '';
            clone.style.backgroundColor = '';
            clone.style.cursor = '';
            clone.style.boxShadow = '';

            // Create temporary container with padding
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                left: -99999px;
                top: -99999px;
                background: ${CONFIG.backgroundColor};
                padding: ${CONFIG.padding}px;
                border-radius: 8px;
            `;
            container.appendChild(clone);
            document.body.appendChild(container);

            // Load html2canvas if needed
            const html2canvas = await loadHtml2Canvas();

            // Render to canvas with high quality settings
            const canvas = await html2canvas(container, {
                scale: CONFIG.scale,
                backgroundColor: CONFIG.backgroundColor,
                logging: false,
                useCORS: true,
                allowTaint: false,
                imageTimeout: 0,
                removeContainer: false
            });

            // Clean up container
            document.body.removeChild(container);

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `block-${timestamp}.png`;

            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Show success message
                state.tooltip.textContent = '✅ Downloaded!';
                state.tooltip.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                
                setTimeout(() => {
                    cleanup();
                }, 1500);
            }, 'image/png');

        } catch (error) {
            console.error('Export failed:', error);
            state.tooltip.textContent = '❌ Export failed';
            state.tooltip.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            
            setTimeout(() => {
                cleanup();
            }, 2500);
        }
    }

    /**
     * Handle click event
     */
    async function handleClick(e) {
        if (!state.isActive || !state.currentHovered) return;

        e.preventDefault();
        e.stopPropagation();

        await exportToPNG(state.currentHovered);
    }

    /**
     * Handle escape key
     */
    function handleEscape(e) {
        if (e.key === 'Escape' && state.isActive) {
            cleanup();
        }
    }

    /**
     * Cleanup and deactivate
     */
    function cleanup() {
        state.isActive = false;
        window.blockToPngActive = false;

        // Restore highlighted element
        if (state.currentHovered) {
            const savedStyle = state.originalStyles.get(state.currentHovered);
            if (savedStyle) {
                state.currentHovered.style.outline = savedStyle.outline;
                state.currentHovered.style.backgroundColor = savedStyle.backgroundColor;
                state.currentHovered.style.cursor = savedStyle.cursor;
                state.currentHovered.style.boxShadow = savedStyle.boxShadow;
            }
            state.currentHovered = null;
        }

        // Clear saved styles
        state.originalStyles.clear();

        // Remove UI elements
        if (state.overlay) {
            state.overlay.remove();
            state.overlay = null;
        }
        if (state.tooltip) {
            state.tooltip.remove();
            state.tooltip = null;
        }

        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleEscape);

        console.log('✅ Block-to-PNG deactivated');
    }

    /**
     * Initialize and activate
     */
    function init() {
        state.isActive = true;
        window.blockToPngActive = true;

        createOverlay();
        createTooltip();

        // Add event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleEscape);

        console.log('🚀 Block-to-PNG activated! Hover over elements and click to export.');
    }

    // Start the magic
    try {
        init();
    } catch (error) {
        console.error('Failed to initialize Block-to-PNG:', error);
        window.blockToPngActive = false;
    }

})();