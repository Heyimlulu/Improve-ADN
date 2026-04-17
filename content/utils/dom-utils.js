/**
 * DOM Utility Functions
 * Common DOM manipulation and element finding utilities
 */

import { VIDEO_SAFETY_SELECTORS } from '../../shared/constants.js';

export const Utils = {
    /**
     * Find element using fallback selectors
     * @param {string[]} selectors - Array of selectors to try
     * @param {string} elementType - Type of element for logging
     * @returns {Element|null} - Found element or null
     */
    findElementWithFallback(selectors, elementType = 'element') {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        return null;
    },

    /**
     * Check if element is safe to hide (not video-related)
     * @param {Element} element - Element to check
     * @returns {boolean} - True if safe to hide
     */
    isElementSafeToHide(element) {
        return !element.classList.contains('video-js') && 
               !element.closest('.video-js') &&
               !element.querySelector('.video-js') &&
               !element.querySelector('video') &&
               !VIDEO_SAFETY_SELECTORS.some(selector => 
                   element.closest(selector) || element.querySelector(selector)
               );
    },

    /**
     * Apply styles to element with error handling
     * @param {Element} element - Element to style
     * @param {Object} styles - Styles to apply
     */
    applyStyles(element, styles) {
        if (!element) return;
        
        Object.entries(styles).forEach(([property, value]) => {
            element.style.setProperty(property, value, 'important');
        });
    },

    /**
     * Remove styles from element
     * @param {Element} element - Element to clean
     * @param {string[]} properties - Properties to remove
     */
    removeStyles(element, properties) {
        if (!element) return;
        
        properties.forEach(property => {
            element.style.removeProperty(property);
        });
    },

    /**
     * Wait for element to appear in DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Element>} - Promise that resolves with element
     */
    waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations) => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
