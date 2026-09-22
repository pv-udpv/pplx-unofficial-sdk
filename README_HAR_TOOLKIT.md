# HAR Analysis Toolkit

Comprehensive toolkit for extracting and analyzing API endpoints from HAR (HTTP Archive) files.

## 🎯 Components

### 1. `har_analyzer.py` - Simple CLI Analyzer

Quick and lightweight HAR analysis tool.

**Usage:**
```bash
python har_analyzer.py capture.har
```

**Output:**
- `har_analysis_YYYY-MM-DD.json` - Full API catalog
- `har_analysis_YYYY-MM-DD.md` - Summary report

**Features:**
- ✅ JS asset extraction
- ✅ API endpoint discovery (410+ patterns)
- ✅ Category classification (SSE, REST, Auth, etc.)
- ✅ JSON/Markdown export

### 2. `har_agent.py` - Advanced Agent

Intelligent agent with caching, AST analysis, and dependency graphs.

**Usage:**
```python
from har_agent import HARAgent

agent = HARAgent("capture.har")
agent.analyze_all()
agent.export_json(Path("analysis.json"))
agent.export_asyncapi(Path("asyncapi.yaml"))
```

**Features:**
- ✅ SQLite caching for incremental analysis
- ✅ Asset classification (JS/CSS/images/fonts)
- ✅ Deep JavaScript analysis
- ✅ Module dependency graph
- ✅ AsyncAPI v3 spec generation
- ✅ Offset tracking for source code mapping
- ✅ Function/class extraction
- ✅ Import/export analysis

## 📊 Analysis Results (2026-01-23)

From `0145-230125-www.perplexity.ai.har`:

- **Total HTTP entries:** 1,140
- **JS assets extracted:** 1,012 (13.0 MB)
- **Unique API endpoints:** 410
- **Assets with APIs:** 159

### API Categories

| Category | Count |
|----------|-------|
| REST | 386 |
| SSE | 10 |
| Auth | 4 |
| Other | 10 |

### Notable Endpoints

**SSE (Server-Sent Events):**
```
/rest/sse/perplexity_clarifying_answer
/rest/sse/perplexity_mcp_response
/rest/sse/handle_tool_user_approval_response
/rest/sse/pro_search_step_result
```

**REST API:**
```
/rest/api-org-management/organizations/{api_org_id}/file_repositories
/rest/threads/{thread_uuid}/messages
/rest/user/profile
/rest/collections/{collection_id}
```

## 🛠️ Technical Architecture

### Data Models

```python
@dataclass
class Asset:
    url: str
    content: str
    size: int
    mime_type: str
    hash: str  # SHA-256[:16]
    domain: str
    headers: Dict[str, str]

@dataclass
class APIEndpoint:
    path: str
    method: str  # GET, POST, etc.
    offset: int  # Position in source code
    line: int
    column: int
    asset_hash: str
    context_function: Optional[str]
    snippet: str  # Code context

@dataclass
class ModuleInfo:
    name: str
    functions: List[str]
    classes: List[str]
    imports: List[str]
    exports: List[str]
    api_calls: List[APIEndpoint]
    dependencies: List[str]
```

### Analysis Pipeline

```
HAR File
  ↓
[Load & Parse]
  ↓
[Extract Assets] → SQLite Cache
  ↓
[Classify by Type] → JS/CSS/Images/etc
  ↓
[Analyze JavaScript]
  ├─ Extract API endpoints
  ├─ Parse functions/classes
  ├─ Build import graph
  └─ Link API → functions
  ↓
[Export]
  ├─ JSON catalog
  ├─ Markdown report
  ├─ AsyncAPI spec
  └─ Dependency graph
```

## 📦 Installation

```bash
# Basic (no dependencies)
python har_analyzer.py capture.har

# Advanced (with caching)
python har_agent.py capture.har
```

**Optional dependencies:**
```bash
pip install tree-sitter tree-sitter-javascript  # For precise AST
```

## 🚀 Use Cases

### 1. API Discovery
Extract all API endpoints from SPA applications:
```bash
python har_analyzer.py www.perplexity.ai.har
```

### 2. Incremental Monitoring
Track API changes over time:
```python
agent = HARAgent("capture_v1.har")
agent.analyze_all()
# Later...
agent2 = HARAgent("capture_v2.har")
agent2.analyze_all()
# Diff analysis
```

### 3. Documentation Generation
Auto-generate AsyncAPI specs:
```python
agent.export_asyncapi("docs/asyncapi.yaml")
```

### 4. Reverse Engineering
Map API calls to source code:
```python
for endpoint, calls in agent.api_endpoints.items():
    for call in calls:
        print(f"{endpoint} called at {call.line}:{call.column} in {call.asset_hash}")
```

## 🔧 Configuration

### HAR Agent Cache

By default, caches to `.har_cache/`:
```python
agent = HARAgent("capture.har", cache_dir="custom_cache")
```

### API Pattern Customization

Add custom patterns in `har_agent.py`:
```python
API_PATTERNS = [
    r'your_custom_pattern',
    # ...
]
```

## 📈 Performance

- **Small HAR (<5MB):** ~1-2 seconds
- **Medium HAR (5-50MB):** ~5-15 seconds  
- **Large HAR (>50MB):** ~30-60 seconds

With caching, subsequent runs are **10x faster**.

## 🤝 Integration

### With MCP Server

```python
# mcp_server/tools/har_analysis.py
from har_agent import HARAgent

def analyze_har_tool(har_path: str) -> dict:
    agent = HARAgent(har_path)
    agent.analyze_all()
    return agent.api_endpoints
```

### With CI/CD

```yaml
# .github/workflows/har-analysis.yml
- name: Analyze HAR
  run: |
    python har_analyzer.py latest_capture.har
    git add har_analysis_*.json
    git commit -m "Update HAR analysis"
```

## 📚 Related Work

- **Issue #59:** HAR Analysis Pipeline roadmap
- **PR #49:** Pydantic schemas for API models
- **SSE Spec:** `/rest/sse/perplexity_ask` documentation
- **AsyncAPI catalog:** 27 channels mapped

## 🔮 Future Enhancements

- [ ] Tree-sitter integration for precise AST
- [ ] Sourcemap recovery for minified code
- [ ] WebSocket event tracking
- [ ] Call graph visualization
- [ ] Chrome DevTools Protocol integration
- [ ] Real-time HAR streaming

## 📄 License

Part of [pv-udpv/perplexity-ai-unofficial](https://github.com/pv-udpv/perplexity-ai-unofficial)

## 🙏 Acknowledgments

Extracted from Perplexity AI web application analysis.
