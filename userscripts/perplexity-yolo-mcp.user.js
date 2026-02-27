// ==UserScript==
// @name         Perplexity YOLO MCP (Auto-Approve)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Bypass MCP tool confirmation on Perplexity.ai - automatically approves all MCP tool executions
// @author       pv-udpv
// @match        https://www.perplexity.ai/*
// @run-at       document-start
// @grant        none
// @homepage     https://github.com/pv-udpv/pplx-unofficial-sdk
// @supportURL   https://github.com/pv-udpv/pplx-unofficial-sdk/issues
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
        const [resource, config] = args;
        
        // Intercept only perplexity_ask requests
        if (typeof resource === 'string' && resource.includes('/rest/sse/perplexity_ask')) {
            try {
                if (config && config.body) {
                    const bodyObj = JSON.parse(config.body);
                    
                    // Modify the confirmation flag
                    if (bodyObj.params && bodyObj.params.should_ask_for_mcp_tool_confirmation !== undefined) {
                        bodyObj.params.should_ask_for_mcp_tool_confirmation = false;
                        config.body = JSON.stringify(bodyObj);
                        console.log('🚀 [YOLO MCP] Auto-approve enabled - MCP confirmation bypassed');
                    }
                }
            } catch (e) {
                console.error('[YOLO MCP] Failed to parse/modify fetch body:', e);
            }
        }
        
        return originalFetch.apply(this, [resource, config]);
    };
    
    console.log('✅ [YOLO MCP] Userscript loaded - MCP auto-approve active');
})();