# HAR Analysis Agent 🤖

Intelligent self-learning agent для reverse-engineering Perplexity AI API через HAR файлы.

## 🎯 Features

- **🧠 Self-Learning:** Накапливает знания о паттернах в SQLite
- **📊 Confidence Scoring:** Автоматическая оценка уверенности для каждого endpoint
- **🔄 Human-in-the-Loop:** Interactive training mode с feedback
- **⚠️ Anomaly Detection:** Детект странных паттернов и potential issues
- **🗑️ Deprecation Tracking:** Мониторинг устаревающих API
- **💾 Persistent Knowledge Base:** SQLite БД для долгосрочной памяти
- **📈 Quality Assessment:** Автоматическая оценка качества анализа

## 🚀 Quick Start

### Installation

```bash
# Требуется Python 3.12+
pip install -r requirements.txt  # Только stdlib, внешних зависимостей нет!
```

### Basic Usage

```bash
# 1. Анализ HAR файла с обучением
python har_agent.py analyze your_file.har.json

# 2. Интерактивное обучение
python har_agent.py train

# 3. Экспорт выученных паттернов
python har_agent.py export patterns.json

# 4. Статистика knowledge base
python har_agent.py stats
```

## 📊 Architecture

```
┌─────────────────────────────────────────────┐
│         HAR Analysis Agent                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────────┐    ┌──────────────────┐   │
│  │ har_       │───▶│ Pattern          │   │
│  │ analyzer.py│    │ Detection        │   │
│  └────────────┘    └──────────────────┘   │
│         │                    │              │
│         ▼                    ▼              │
│  ┌────────────────────────────────┐        │
│  │    Intelligence Engine         │        │
│  │  • Confidence scoring          │        │
│  │  • Anomaly detection           │        │
│  │  • Deprecation tracking        │        │
│  └────────────────────────────────┘        │
│         │                                   │
│         ▼                                   │
│  ┌────────────────────────────────┐        │
│  │    Knowledge Base (SQLite)     │        │
│  │  • Patterns                    │        │
│  │  • Endpoints                   │        │
│  │  • Analysis history            │        │
│  │  • Human feedback              │        │
│  └────────────────────────────────┘        │
│         │                                   │
│         ▼                                   │
│  ┌────────────────────────────────┐        │
│  │    Output & Learning           │        │
│  │  • JSON reports                │        │
│  │  • Pattern export              │        │
│  │  • Interactive training        │        │
│  └────────────────────────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

## 🔍 How It Works

### 1. Pattern Learning

Agent извлекает API endpoints и нормализует их в паттерны:

```python
# Конкретный endpoint
/rest/threads/abc123/messages

# Нормализованный pattern
/rest/threads/{id}/messages
```

### 2. Confidence Scoring

```python
Initial: 0.5              # Новый endpoint
+0.05 per occurrence      # Каждое появление
+0.10 on correct feedback # Human validation
-0.20 on false positive   # Human correction
Max: 1.0                  # Полная уверенность
```

### 3. Intelligence Enrichment

Каждый endpoint обогащается:

```python
@dataclass
class APIEndpointIntel:
    path: str                    # /rest/sse/perplexity_ask
    method: str                  # POST
    category: str                # SSE
    confidence: float            # 0.87
    stability_score: float       # 0.92  ← часто встречается
    first_discovered: str        # 2026-01-15T...
    last_seen: str              # 2026-01-23T...
    version_history: List[str]   # [v1, v2]
    deprecation_risk: float      # 0.1   ← низкий риск
    related_endpoints: List[str] # связанные API
```

### 4. Anomaly Detection

- **unusual_length:** endpoint > 200 символов
- **unresolved_template:** содержит `${...}` или `{{...}}`
- **suspicious_params:** странные query parameters
- **rate_spike:** резкий рост вызовов

## 📚 Knowledge Base Schema

### patterns
```sql
CREATE TABLE patterns (
    pattern TEXT UNIQUE,      -- /rest/threads/{id}/...
    category TEXT,            -- REST, SSE, Auth
    confidence REAL,          -- 0.0 - 1.0
    first_seen TEXT,
    last_seen TEXT,
    occurrence_count INTEGER,
    sources TEXT              -- JSON: asset hashes
);
```

### endpoints
```sql
CREATE TABLE endpoints (
    path TEXT UNIQUE,
    method TEXT,
    category TEXT,
    confidence REAL,
    stability_score REAL,
    first_discovered TEXT,
    last_seen TEXT,
    version_history TEXT,     -- JSON
    deprecation_risk REAL,
    related_endpoints TEXT    -- JSON
);
```

### analysis_history
```sql
CREATE TABLE analysis_history (
    har_file TEXT,
    analyzed_at TEXT,
    js_assets_count INTEGER,
    endpoints_found INTEGER,
    new_patterns INTEGER,
    quality_score REAL
);
```

## 🎓 Interactive Training

```bash
$ python har_agent.py train

🎓 Interactive Training Mode
================================================================================

📍 Endpoint: /rest/api-org-management/organizations/{api_org_id}/users
   Current confidence: 0.65

   Feedback (c=correct/f=false/m=missed/s=skip): c
   ✓ Marked as correct, confidence increased

📍 Endpoint: /rest/sse/handle_tool_user_approval_response
   Current confidence: 0.72

   Feedback (c=correct/f=false/m=missed/s=skip): c
   ✓ Marked as correct, confidence increased
```

## 📈 Example Analysis Report

```json
{
  "summary": {
    "js_assets": 1012,
    "endpoints_found": 410,
    "new_discoveries": 23,
    "anomalies": 3,
    "deprecated_risk": 5,
    "quality_score": 0.92
  },
  "knowledge_stats": {
    "total_patterns": 387,
    "high_confidence_patterns": 312,
    "total_endpoints": 410,
    "high_confidence_endpoints": 354,
    "total_analyses": 15,
    "avg_quality_score": 0.88
  },
  "new_discoveries": [
    {
      "path": "/rest/sse/perplexity_mcp_response",
      "confidence": 0.45,
      "category": "SSE",
      "method": "GET"
    }
  ]
}
```

## 🛠️ Advanced Usage

### Programmatic API

```python
from har_agent import HARAgent, KnowledgeBase

# Initialize agent
agent = HARAgent(knowledge_db="my_custom.db")

# Analyze without learning
report = agent.analyze_har("file.har.json", learn=False)

# Batch processing
har_files = Path("hars/").glob("*.har.json")
for har_file in har_files:
    agent.analyze_har(str(har_file), learn=True)

# Export patterns
agent.export_learned_patterns("shared_patterns.json")

# Get stats
stats = agent.kb.get_stats()
print(f"Total patterns: {stats['total_patterns']}")

agent.close()
```

### Custom Feedback

```python
# Programmatic feedback
agent.kb.add_feedback(
    endpoint_path="/rest/sse/perplexity_ask",
    feedback_type="correct",
    comment="Verified via manual testing"
)
```

## 🔄 Continuous Improvement

Agent улучшается со временем:

1. **Analysis #1:** 410 endpoints, 50% confidence
2. **Analysis #5:** 425 endpoints, 70% confidence (паттерны распознаются)
3. **Analysis #10:** 430 endpoints, 85% confidence (высокая точность)
4. **+Training:** 95%+ confidence после human validation

## 📊 Quality Metrics

- **Confidence:** средняя уверенность по всем endpoints
- **Stability Score:** как часто endpoint встречается
- **Quality Score:** общая оценка анализа (0.0 - 1.0)
- **Deprecation Risk:** вероятность устаревания API

## 🚦 Next Steps

### Phase 2: Enhanced Intelligence
- [ ] Tree-sitter для точного AST
- [ ] Call graph generation
- [ ] Sourcemap recovery

### Phase 3: ML Integration
- [ ] Clustering similar endpoints
- [ ] Predict new endpoints
- [ ] Automatic category classification

### Phase 4: Real-time
- [ ] Chrome extension для live HAR capture
- [ ] WebSocket streaming analysis
- [ ] Real-time deprecation alerts

## 📝 Related Tools

- `har_analyzer.py` - базовый анализатор (используется агентом)
- `tools/` - вспомогательные утилиты
- `.copilot-instructions.md` - руководство для AI-ассистентов

## 🤝 Contributing

См. [CONTRIBUTING.md](CONTRIBUTING.md) для guidelines.

## 📄 License

MIT License - см. [LICENSE](LICENSE)

---

**Repository:** [pv-udpv/perplexity-ai-unofficial](https://github.com/pv-udpv/perplexity-ai-unofficial)  
**Issue:** #60  
**Related:** #59 (HAR Analysis Pipeline)
