# Perplexity AI Userscripts

Collection of Tampermonkey/Greasemonkey userscripts for enhancing Perplexity.ai functionality.

## 🚀 Available Scripts

### Perplexity YOLO MCP (Auto-Approve)

**File:** `perplexity-yolo-mcp.user.js`

**Purpose:** Automatically bypasses MCP (Model Context Protocol) tool confirmation prompts on Perplexity.ai.

**Features:**
- ✅ Intercepts `fetch` requests to `/rest/sse/perplexity_ask`
- ✅ Modifies `should_ask_for_mcp_tool_confirmation` flag to `false`
- ✅ Zero user interaction required
- ✅ Minimal performance overhead
- ✅ Console logging for debugging

**How It Works:**

1. Hooks into `window.fetch` at document start
2. Detects API calls to the perplexity_ask endpoint
3. Parses request body JSON
4. Modifies the MCP confirmation flag
5. Passes modified request to original fetch

**Installation:**

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Click [here](https://raw.githubusercontent.com/pv-udpv/pplx-unofficial-sdk/main/userscripts/perplexity-yolo-mcp.user.js) to install (after merge)
3. Confirm installation in your userscript manager
4. Navigate to [perplexity.ai](https://www.perplexity.ai)
5. Open browser console to see confirmation: `✅ [YOLO MCP] Userscript loaded`

**Security Warning:**

⚠️ This script disables safety confirmations for MCP tool execution. Use at your own risk. MCP tools can:
- Execute code on GitHub repositories
- Create/modify files
- Send API requests
- Access external services

Only use this if you:
- Trust all configured MCP servers
- Understand what each MCP tool does
- Accept full responsibility for automated actions

**Debug Mode:**

Check browser console for logs:
```
🚀 [YOLO MCP] Auto-approve enabled - MCP confirmation bypassed
✅ [YOLO MCP] Userscript loaded - MCP auto-approve active
```

## 📋 Requirements

- Modern browser (Chrome, Firefox, Edge, Safari)
- Tampermonkey, Violentmonkey, or Greasemonkey extension
- Perplexity.ai account with MCP configured

## 🛠️ Development

### Testing Locally

1. Copy userscript content
2. Create new script in Tampermonkey dashboard
3. Paste content and save
4. Visit perplexity.ai to test

### Adding New Scripts

1. Create `your-script-name.user.js` in this directory
2. Follow [Tampermonkey documentation](https://www.tampermonkey.net/documentation.php)
3. Update this README with script details
4. Submit PR with:
   - Script file
   - Documentation
   - Usage examples

## 📝 License

MIT License - See [LICENSE](../LICENSE) for details

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## ⚠️ Disclaimer

These userscripts modify Perplexity.ai client-side behavior. Use responsibly and in accordance with Perplexity's Terms of Service. The authors are not responsible for any consequences of using these scripts.

## 🔗 Related Projects

- [pplx-unofficial-sdk](https://github.com/pv-udpv/pplx-unofficial-sdk) - Main SDK repository
- [MCP Specification](https://modelcontextprotocol.io/) - Model Context Protocol docs

---

**Repository:** [pv-udpv/pplx-unofficial-sdk](https://github.com/pv-udpv/pplx-unofficial-sdk)
**Issues:** [Report a bug](https://github.com/pv-udpv/pplx-unofficial-sdk/issues)