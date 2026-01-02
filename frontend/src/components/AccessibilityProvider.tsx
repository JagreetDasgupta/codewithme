import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';

const SkipLink = styled.a`
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: var(--primary-color);
  color: white;
  z-index: 10000;
  text-decoration: none;
  font-weight: 600;

  &:focus {
    top: 0;
  }
`;

const AccessibilityPanel = styled.div<{ isOpen: boolean }>`
  position: fixed;
  right: ${props => props.isOpen ? '0' : '-320px'};
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px 0 0 8px;
  padding: 1rem;
  z-index: 1000;
  transition: right 0.3s ease;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
`;

const AccessibilityToggle = styled.button`
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  z-index: 1001;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.8rem;

  &:focus {
    outline: 3px solid #ffd700;
    outline-offset: 2px;
  }
`;

const SettingGroup = styled.div`
  margin-bottom: 1rem;
`;

const SettingLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Slider = styled.input`
  flex: 1;
`;

const SliderValue = styled.span`
  min-width: 40px;
  text-align: center;
  font-size: 0.875rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.75rem;
  font-size: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
`;

const ResetButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;

  &:hover {
    background: var(--surface-hover);
  }

  &:focus {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }
`;

export interface AccessibilitySettings {
    highContrastMode: boolean;
    fontSize: number;
    lineHeight: number;
    reducedMotion: boolean;
    dyslexicFont: boolean;
    focusIndicators: boolean;
    screenReaderOptimized: boolean;
    keyboardShortcuts: boolean;
    cursorSize: 'default' | 'large' | 'extra-large';
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

const defaultSettings: AccessibilitySettings = {
    highContrastMode: false,
    fontSize: 14,
    lineHeight: 1.5,
    reducedMotion: false,
    dyslexicFont: false,
    focusIndicators: true,
    screenReaderOptimized: false,
    keyboardShortcuts: true,
    cursorSize: 'default',
    colorBlindMode: 'none'
};

interface AccessibilityProviderProps {
    children: React.ReactNode;
    onSettingsChange?: (settings: AccessibilitySettings) => void;
}

/**
 * Accessibility provider component for WCAG 2.1 AA compliance
 */
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
    children,
    onSettingsChange
}) => {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        const saved = localStorage.getItem('accessibility-settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    });
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Apply settings to document
    useEffect(() => {
        const root = document.documentElement;

        // Font size
        root.style.setProperty('--a11y-font-size', `${settings.fontSize}px`);
        root.style.setProperty('--a11y-line-height', `${settings.lineHeight}`);

        // High contrast
        if (settings.highContrastMode) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        // Reduced motion
        if (settings.reducedMotion) {
            root.classList.add('reduced-motion');
        } else {
            root.classList.remove('reduced-motion');
        }

        // Dyslexic font
        if (settings.dyslexicFont) {
            root.style.setProperty('--a11y-font-family', 'OpenDyslexic, Arial, sans-serif');
        } else {
            root.style.removeProperty('--a11y-font-family');
        }

        // Focus indicators
        if (settings.focusIndicators) {
            root.classList.add('enhanced-focus');
        } else {
            root.classList.remove('enhanced-focus');
        }

        // Color blind filters
        if (settings.colorBlindMode !== 'none') {
            root.classList.add(`colorblind-${settings.colorBlindMode}`);
        } else {
            ['protanopia', 'deuteranopia', 'tritanopia'].forEach(mode => {
                root.classList.remove(`colorblind-${mode}`);
            });
        }

        // Cursor size
        root.dataset.cursorSize = settings.cursorSize;

        // Save to localStorage
        localStorage.setItem('accessibility-settings', JSON.stringify(settings));

        // Notify parent
        onSettingsChange?.(settings);
    }, [settings, onSettingsChange]);

    // Check for prefers-reduced-motion
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) {
            setSettings(prev => ({ ...prev, reducedMotion: true }));
        }
    }, []);

    const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
        key: K,
        value: AccessibilitySettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(defaultSettings);
    }, []);

    // Keyboard navigation for panel
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt + A to toggle accessibility panel
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                setIsPanelOpen(prev => !prev);
            }

            // Escape to close panel
            if (e.key === 'Escape' && isPanelOpen) {
                setIsPanelOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPanelOpen]);

    // Announce settings changes to screen readers
    const announceChange = (message: string) => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    };

    return (
        <>
            {/* Skip to main content link */}
            <SkipLink href="#main-content">Skip to main content</SkipLink>

            {/* Accessibility toggle button */}
            <AccessibilityToggle
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                aria-label="Open accessibility settings"
                aria-expanded={isPanelOpen}
            >
                ♿ Accessibility
            </AccessibilityToggle>

            {/* Accessibility settings panel */}
            <AccessibilityPanel
                isOpen={isPanelOpen}
                ref={panelRef}
                role="dialog"
                aria-label="Accessibility settings"
                aria-modal="true"
            >
                <SectionTitle>Accessibility Settings</SectionTitle>

                <SettingGroup>
                    <SettingLabel>
                        <input
                            type="checkbox"
                            checked={settings.highContrastMode}
                            onChange={(e) => {
                                updateSetting('highContrastMode', e.target.checked);
                                announceChange(`High contrast mode ${e.target.checked ? 'enabled' : 'disabled'}`);
                            }}
                        />
                        High Contrast Mode
                    </SettingLabel>

                    <SettingLabel>
                        <input
                            type="checkbox"
                            checked={settings.reducedMotion}
                            onChange={(e) => {
                                updateSetting('reducedMotion', e.target.checked);
                                announceChange(`Reduced motion ${e.target.checked ? 'enabled' : 'disabled'}`);
                            }}
                        />
                        Reduce Motion
                    </SettingLabel>

                    <SettingLabel>
                        <input
                            type="checkbox"
                            checked={settings.dyslexicFont}
                            onChange={(e) => {
                                updateSetting('dyslexicFont', e.target.checked);
                                announceChange(`Dyslexic font ${e.target.checked ? 'enabled' : 'disabled'}`);
                            }}
                        />
                        Dyslexia-Friendly Font
                    </SettingLabel>

                    <SettingLabel>
                        <input
                            type="checkbox"
                            checked={settings.focusIndicators}
                            onChange={(e) => {
                                updateSetting('focusIndicators', e.target.checked);
                                announceChange(`Enhanced focus indicators ${e.target.checked ? 'enabled' : 'disabled'}`);
                            }}
                        />
                        Enhanced Focus Indicators
                    </SettingLabel>

                    <SettingLabel>
                        <input
                            type="checkbox"
                            checked={settings.screenReaderOptimized}
                            onChange={(e) => {
                                updateSetting('screenReaderOptimized', e.target.checked);
                                announceChange(`Screen reader optimization ${e.target.checked ? 'enabled' : 'disabled'}`);
                            }}
                        />
                        Screen Reader Optimized
                    </SettingLabel>
                </SettingGroup>

                <SettingGroup>
                    <label htmlFor="fontSize">Font Size: {settings.fontSize}px</label>
                    <SliderContainer>
                        <Slider
                            id="fontSize"
                            type="range"
                            min="12"
                            max="24"
                            value={settings.fontSize}
                            onChange={(e) => {
                                updateSetting('fontSize', parseInt(e.target.value));
                            }}
                            aria-valuemin={12}
                            aria-valuemax={24}
                            aria-valuenow={settings.fontSize}
                        />
                        <SliderValue>{settings.fontSize}px</SliderValue>
                    </SliderContainer>
                </SettingGroup>

                <SettingGroup>
                    <label htmlFor="lineHeight">Line Height: {settings.lineHeight}</label>
                    <SliderContainer>
                        <Slider
                            id="lineHeight"
                            type="range"
                            min="1"
                            max="2.5"
                            step="0.1"
                            value={settings.lineHeight}
                            onChange={(e) => {
                                updateSetting('lineHeight', parseFloat(e.target.value));
                            }}
                            aria-valuemin={1}
                            aria-valuemax={2.5}
                            aria-valuenow={settings.lineHeight}
                        />
                        <SliderValue>{settings.lineHeight}</SliderValue>
                    </SliderContainer>
                </SettingGroup>

                <SettingGroup>
                    <label htmlFor="colorBlindMode">Color Blind Mode</label>
                    <select
                        id="colorBlindMode"
                        value={settings.colorBlindMode}
                        onChange={(e) => {
                            updateSetting('colorBlindMode', e.target.value as any);
                            announceChange(`Color blind mode set to ${e.target.value}`);
                        }}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                    >
                        <option value="none">None</option>
                        <option value="protanopia">Protanopia (Red-blindness)</option>
                        <option value="deuteranopia">Deuteranopia (Green-blindness)</option>
                        <option value="tritanopia">Tritanopia (Blue-blindness)</option>
                    </select>
                </SettingGroup>

                <SettingGroup>
                    <label htmlFor="cursorSize">Cursor Size</label>
                    <select
                        id="cursorSize"
                        value={settings.cursorSize}
                        onChange={(e) => {
                            updateSetting('cursorSize', e.target.value as any);
                            announceChange(`Cursor size set to ${e.target.value}`);
                        }}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                    >
                        <option value="default">Default</option>
                        <option value="large">Large</option>
                        <option value="extra-large">Extra Large</option>
                    </select>
                </SettingGroup>

                <ResetButton onClick={resetSettings}>
                    Reset to Defaults
                </ResetButton>

                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <strong>Keyboard Shortcuts:</strong>
                    <br />
                    Alt + A: Toggle this panel
                    <br />
                    Escape: Close panel
                </div>
            </AccessibilityPanel>

            {/* Main content with landmark */}
            <main id="main-content" role="main">
                {children}
            </main>

            {/* Global accessibility styles */}
            <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .high-contrast {
          --background-color: #000;
          --surface-color: #1a1a1a;
          --surface-elevated: #2a2a2a;
          --text-color: #fff;
          --text-muted: #ccc;
          --border-color: #fff;
          --primary-color: #ffff00;
        }

        .reduced-motion * {
          animation: none !important;
          transition: none !important;
        }

        .enhanced-focus *:focus {
          outline: 3px solid var(--primary-color) !important;
          outline-offset: 3px !important;
        }

        .colorblind-protanopia {
          filter: url('#protanopia-filter');
        }

        .colorblind-deuteranopia {
          filter: url('#deuteranopia-filter');
        }

        .colorblind-tritanopia {
          filter: url('#tritanopia-filter');
        }

        [data-cursor-size="large"] * {
          cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%23000"/></svg>'), auto;
        }

        [data-cursor-size="extra-large"] * {
          cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="%23000"/></svg>'), auto;
        }
      `}</style>

            {/* SVG filters for color blindness simulation */}
            <svg style={{ display: 'none' }}>
                <defs>
                    <filter id="protanopia-filter">
                        <feColorMatrix
                            type="matrix"
                            values="0.567, 0.433, 0,     0, 0
                      0.558, 0.442, 0,     0, 0
                      0,     0.242, 0.758, 0, 0
                      0,     0,     0,     1, 0"
                        />
                    </filter>
                    <filter id="deuteranopia-filter">
                        <feColorMatrix
                            type="matrix"
                            values="0.625, 0.375, 0,   0, 0
                      0.7,   0.3,   0,   0, 0
                      0,     0.3,   0.7, 0, 0
                      0,     0,     0,   1, 0"
                        />
                    </filter>
                    <filter id="tritanopia-filter">
                        <feColorMatrix
                            type="matrix"
                            values="0.95, 0.05,  0,     0, 0
                      0,    0.433, 0.567, 0, 0
                      0,    0.475, 0.525, 0, 0
                      0,    0,     0,     1, 0"
                        />
                    </filter>
                </defs>
            </svg>
        </>
    );
};

export default AccessibilityProvider;
