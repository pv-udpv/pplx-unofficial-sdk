#!/usr/bin/env python3
"""
Intelligent HAR Analysis Agent для Perplexity AI
Самообучающийся агент для анализа HAR файлов с накоплением знаний

Features:
- 🧠 Pattern learning & evolution tracking
- 📊 Confidence scoring & anomaly detection
- 🔄 Continuous improvement from feedback
- 💾 Persistent knowledge base (SQLite)
- 🎯 API versioning & deprecation detection
- 🤖 Autonomous mode для batch processing

Usage:
    python har_agent.py analyze <har_file>       # Analyze with learning
    python har_agent.py train                     # Interactive training
    python har_agent.py export <output.json>      # Export learned patterns
    python har_agent.py stats                     # Show knowledge base stats
"""

import json
import sqlite3
import hashlib
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import re


@dataclass
class Pattern:
    """Learned API pattern"""
    pattern: str
    category: str
    confidence: float  # 0.0 - 1.0
    first_seen: str
    last_seen: str
    occurrence_count: int
    sources: List[str]  # Asset hashes где встречался


@dataclass
class APIEndpointIntel:
    """Enriched API endpoint с intelligence"""
    path: str
    method: str
    category: str
    confidence: float
    stability_score: float  # Насколько стабилен (часто встречается)
    first_discovered: str
    last_seen: str
    version_history: List[str]  # Изменения паттерна
    deprecation_risk: float  # Риск deprecation
    related_endpoints: List[str]  # Связанные endpoints


class KnowledgeBase:
    """Persistent knowledge base для агента"""

    def __init__(self, db_path: str = "har_agent_knowledge.db"):
        self.db_path = Path(db_path)
        self.conn = sqlite3.connect(str(self.db_path))
        self._init_schema()

    def _init_schema(self):
        """Создание схемы БД"""
        cursor = self.conn.cursor()

        # Patterns table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                confidence REAL DEFAULT 0.5,
                first_seen TEXT,
                last_seen TEXT,
                occurrence_count INTEGER DEFAULT 1,
                sources TEXT  -- JSON array
            )
        """)

        # Endpoints table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS endpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                method TEXT,
                category TEXT,
                confidence REAL DEFAULT 0.5,
                stability_score REAL DEFAULT 0.0,
                first_discovered TEXT,
                last_seen TEXT,
                version_history TEXT,  -- JSON array
                deprecation_risk REAL DEFAULT 0.0,
                related_endpoints TEXT  -- JSON array
            )
        """)

        # HAR Analysis History
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                har_file TEXT NOT NULL,
                analyzed_at TEXT,
                js_assets_count INTEGER,
                endpoints_found INTEGER,
                new_patterns INTEGER,
                quality_score REAL
            )
        """)

        # Feedback table (для human-in-the-loop)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint_id INTEGER,
                feedback_type TEXT,  -- 'correct', 'false_positive', 'missed'
                comment TEXT,
                created_at TEXT,
                FOREIGN KEY (endpoint_id) REFERENCES endpoints(id)
            )
        """)

        self.conn.commit()

    def learn_pattern(self, pattern: Pattern):
        """Обучение на новом паттерне"""
        cursor = self.conn.cursor()

        cursor.execute("""
            INSERT INTO patterns (pattern, category, confidence, first_seen, last_seen, occurrence_count, sources)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(pattern) DO UPDATE SET
                last_seen = excluded.last_seen,
                occurrence_count = occurrence_count + 1,
                confidence = MIN(1.0, confidence + 0.05),  -- Increase confidence
                sources = excluded.sources
        """, (
            pattern.pattern,
            pattern.category,
            pattern.confidence,
            pattern.first_seen,
            pattern.last_seen,
            pattern.occurrence_count,
            json.dumps(pattern.sources)
        ))

        self.conn.commit()

    def learn_endpoint(self, endpoint: APIEndpointIntel):
        """Обучение на endpoint"""
        cursor = self.conn.cursor()

        cursor.execute("""
            INSERT INTO endpoints (path, method, category, confidence, stability_score, 
                                  first_discovered, last_seen, version_history, 
                                  deprecation_risk, related_endpoints)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                last_seen = excluded.last_seen,
                confidence = MIN(1.0, confidence + 0.03),
                stability_score = (stability_score + excluded.stability_score) / 2,
                version_history = excluded.version_history
        """, (
            endpoint.path,
            endpoint.method,
            endpoint.category,
            endpoint.confidence,
            endpoint.stability_score,
            endpoint.first_discovered,
            endpoint.last_seen,
            json.dumps(endpoint.version_history),
            endpoint.deprecation_risk,
            json.dumps(endpoint.related_endpoints)
        ))

        self.conn.commit()

    def get_learned_patterns(self, min_confidence: float = 0.7) -> List[Pattern]:
        """Получить изученные паттерны"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT pattern, category, confidence, first_seen, last_seen, 
                   occurrence_count, sources
            FROM patterns
            WHERE confidence >= ?
            ORDER BY confidence DESC, occurrence_count DESC
        """, (min_confidence,))

        patterns = []
        for row in cursor.fetchall():
            patterns.append(Pattern(
                pattern=row[0],
                category=row[1],
                confidence=row[2],
                first_seen=row[3],
                last_seen=row[4],
                occurrence_count=row[5],
                sources=json.loads(row[6])
            ))

        return patterns

    def detect_deprecations(self, days_threshold: int = 30) -> List[APIEndpointIntel]:
        """Детект возможных deprecated endpoints"""
        cursor = self.conn.cursor()
        threshold_date = (datetime.now() - timedelta(days=days_threshold)).isoformat()

        cursor.execute("""
            SELECT path, method, category, confidence, stability_score,
                   first_discovered, last_seen, version_history,
                   deprecation_risk, related_endpoints
            FROM endpoints
            WHERE last_seen < ?
            ORDER BY deprecation_risk DESC
        """, (threshold_date,))

        deprecated = []
        for row in cursor.fetchall():
            intel = APIEndpointIntel(
                path=row[0],
                method=row[1],
                category=row[2],
                confidence=row[3],
                stability_score=row[4],
                first_discovered=row[5],
                last_seen=row[6],
                version_history=json.loads(row[7]),
                deprecation_risk=row[8],
                related_endpoints=json.loads(row[9])
            )
            deprecated.append(intel)

        return deprecated

    def add_feedback(self, endpoint_path: str, feedback_type: str, comment: str = ""):
        """Human-in-the-loop feedback"""
        cursor = self.conn.cursor()

        # Find endpoint ID
        cursor.execute("SELECT id FROM endpoints WHERE path = ?", (endpoint_path,))
        result = cursor.fetchone()

        if result:
            endpoint_id = result[0]
            cursor.execute("""
                INSERT INTO feedback (endpoint_id, feedback_type, comment, created_at)
                VALUES (?, ?, ?, ?)
            """, (endpoint_id, feedback_type, comment, datetime.now().isoformat()))

            # Adjust confidence based on feedback
            if feedback_type == 'correct':
                cursor.execute("""
                    UPDATE endpoints 
                    SET confidence = MIN(1.0, confidence + 0.1)
                    WHERE id = ?
                """, (endpoint_id,))
            elif feedback_type == 'false_positive':
                cursor.execute("""
                    UPDATE endpoints 
                    SET confidence = MAX(0.0, confidence - 0.2)
                    WHERE id = ?
                """, (endpoint_id,))

            self.conn.commit()

    def get_stats(self) -> Dict:
        """Статистика knowledge base"""
        cursor = self.conn.cursor()

        stats = {}

        cursor.execute("SELECT COUNT(*) FROM patterns")
        stats['total_patterns'] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM patterns WHERE confidence >= 0.8")
        stats['high_confidence_patterns'] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM endpoints")
        stats['total_endpoints'] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM endpoints WHERE confidence >= 0.8")
        stats['high_confidence_endpoints'] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM analysis_history")
        stats['total_analyses'] = cursor.fetchone()[0]

        cursor.execute("SELECT AVG(quality_score) FROM analysis_history")
        stats['avg_quality_score'] = cursor.fetchone()[0] or 0.0

        return stats

    def close(self):
        self.conn.close()


class HARAgent:
    """Intelligent HAR Analysis Agent"""

    def __init__(self, knowledge_db: str = "har_agent_knowledge.db"):
        self.kb = KnowledgeBase(knowledge_db)
        self.current_session = {
            'har_file': None,
            'started_at': datetime.now().isoformat(),
            'discoveries': [],
            'anomalies': [],
            'quality_metrics': {}
        }

    def analyze_har(self, har_path: str, learn: bool = True) -> Dict:
        """
        Анализ HAR файла с применением накопленных знаний

        Args:
            har_path: путь к HAR файлу
            learn: обновлять knowledge base после анализа
        """
        print(f"\n🤖 HAR Agent starting analysis...")
        print(f"📁 HAR file: {har_path}")

        self.current_session['har_file'] = har_path

        # 1. Базовый анализ (используем существующий HARAnalyzer)
        from har_analyzer import HARAnalyzer
        analyzer = HARAnalyzer(har_path)
        har_data = analyzer.load_har()
        analyzer.extract_js_assets(har_data)
        analyzer.extract_api_endpoints()

        # 2. Применяем знания
        print(f"\n🧠 Applying learned patterns...")
        learned_patterns = self.kb.get_learned_patterns(min_confidence=0.7)
        print(f"   Using {len(learned_patterns)} high-confidence patterns")

        # 3. Enrichment: добавляем intelligence к найденным endpoints
        enriched_endpoints = []
        new_discoveries = []

        for endpoint_path, sources in analyzer.api_endpoints.items():
            # Проверяем, знаем ли мы этот endpoint
            intel = self._enrich_endpoint(endpoint_path, sources, learned_patterns)
            enriched_endpoints.append(intel)

            # Новые discovery?
            if intel.confidence < 0.5:  # Низкая уверенность = новый
                new_discoveries.append(intel)

        # 4. Anomaly detection
        anomalies = self._detect_anomalies(enriched_endpoints)

        # 5. Deprecation detection
        deprecated = self.kb.detect_deprecations(days_threshold=30)

        # 6. Learn from this analysis
        if learn:
            print(f"\n📚 Learning from analysis...")
            self._learn_from_analysis(enriched_endpoints, analyzer.js_assets)

        # 7. Quality assessment
        quality_score = self._assess_quality(enriched_endpoints, new_discoveries, anomalies)

        # 8. Save analysis history
        self._save_analysis_history(
            har_path,
            len(analyzer.js_assets),
            len(enriched_endpoints),
            len(new_discoveries),
            quality_score
        )

        # Report
        report = {
            'summary': {
                'js_assets': len(analyzer.js_assets),
                'endpoints_found': len(enriched_endpoints),
                'new_discoveries': len(new_discoveries),
                'anomalies': len(anomalies),
                'deprecated_risk': len(deprecated),
                'quality_score': quality_score
            },
            'enriched_endpoints': [asdict(e) for e in enriched_endpoints],
            'new_discoveries': [asdict(e) for e in new_discoveries],
            'anomalies': anomalies,
            'deprecated': [asdict(d) for d in deprecated],
            'knowledge_stats': self.kb.get_stats()
        }

        self._print_report(report)

        return report

    def _enrich_endpoint(self, path: str, sources: List[dict], 
                         learned_patterns: List[Pattern]) -> APIEndpointIntel:
        """Обогащение endpoint intelligence"""
        now = datetime.now().isoformat()

        # Category detection
        category = self._detect_category(path)

        # Confidence scoring (на основе learned patterns)
        confidence = 0.5  # default
        for pattern in learned_patterns:
            if re.search(pattern.pattern, path):
                confidence = max(confidence, pattern.confidence)
                break

        # Stability score (как часто встречается в разных sources)
        stability_score = min(1.0, len(set(s['hash'] for s in sources)) / 10.0)

        # Deprecation risk (пока простая эвристика)
        deprecation_risk = 0.1 if confidence > 0.8 else 0.3

        return APIEndpointIntel(
            path=path,
            method=self._infer_method(path),
            category=category,
            confidence=confidence,
            stability_score=stability_score,
            first_discovered=now,
            last_seen=now,
            version_history=[],
            deprecation_risk=deprecation_risk,
            related_endpoints=[]
        )

    def _detect_category(self, path: str) -> str:
        """Category detection"""
        if '/sse/' in path:
            return 'SSE'
        elif '/rest/' in path:
            return 'REST'
        elif '/realtime/' in path:
            return 'Realtime'
        elif '/threads/' in path:
            return 'Threads'
        elif '/auth/' in path or '/login' in path:
            return 'Auth'
        else:
            return 'Other'

    def _infer_method(self, path: str) -> str:
        """HTTP method inference"""
        if '/create' in path or '/add' in path:
            return 'POST'
        elif '/update' in path or '/edit' in path:
            return 'PUT'
        elif '/delete' in path or '/remove' in path:
            return 'DELETE'
        else:
            return 'GET'

    def _detect_anomalies(self, endpoints: List[APIEndpointIntel]) -> List[Dict]:
        """Anomaly detection"""
        anomalies = []

        # Странные паттерны
        for ep in endpoints:
            if len(ep.path) > 200:  # Слишком длинный
                anomalies.append({
                    'type': 'unusual_length',
                    'endpoint': ep.path,
                    'severity': 'medium'
                })

            if '${' in ep.path or '{{' in ep.path:  # Template не resolved
                anomalies.append({
                    'type': 'unresolved_template',
                    'endpoint': ep.path,
                    'severity': 'low'
                })

        return anomalies

    def _learn_from_analysis(self, endpoints: List[APIEndpointIntel], js_assets: List):
        """Обучение на результатах анализа"""
        for ep in endpoints:
            self.kb.learn_endpoint(ep)

            # Learn pattern
            pattern = Pattern(
                pattern=self._extract_pattern(ep.path),
                category=ep.category,
                confidence=ep.confidence,
                first_seen=ep.first_discovered,
                last_seen=ep.last_seen,
                occurrence_count=1,
                sources=[]
            )
            self.kb.learn_pattern(pattern)

    def _extract_pattern(self, path: str) -> str:
        """Извлечение regex pattern из конкретного path"""
        # Заменяем UUID, числа на placeholders
        pattern = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 
                        '{uuid}', path)
        pattern = re.sub(r'\d+', '{id}', pattern)
        return pattern

    def _assess_quality(self, endpoints: List[APIEndpointIntel], 
                       new_discoveries: List, anomalies: List) -> float:
        """Quality assessment"""
        score = 1.0

        # Penalty за anomalies
        score -= len(anomalies) * 0.05

        # Bonus за high confidence endpoints
        high_conf = sum(1 for e in endpoints if e.confidence > 0.8)
        score += (high_conf / max(len(endpoints), 1)) * 0.2

        return max(0.0, min(1.0, score))

    def _save_analysis_history(self, har_file: str, js_count: int, 
                               endpoints_count: int, new_patterns: int, quality: float):
        """Save to history"""
        cursor = self.kb.conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_history 
            (har_file, analyzed_at, js_assets_count, endpoints_found, new_patterns, quality_score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (har_file, datetime.now().isoformat(), js_count, endpoints_count, 
              new_patterns, quality))
        self.kb.conn.commit()

    def _print_report(self, report: Dict):
        """Pretty print report"""
        print(f"\n" + "="*80)
        print(f"🤖 HAR AGENT ANALYSIS REPORT")
        print(f"="*80)

        s = report['summary']
        print(f"\n📊 Summary:")
        print(f"  JS Assets: {s['js_assets']}")
        print(f"  Endpoints Found: {s['endpoints_found']}")
        print(f"  🆕 New Discoveries: {s['new_discoveries']}")
        print(f"  ⚠️  Anomalies: {s['anomalies']}")
        print(f"  🗑️  Deprecation Risk: {s['deprecated_risk']}")
        print(f"  ⭐ Quality Score: {s['quality_score']:.2f}")

        kb_stats = report['knowledge_stats']
        print(f"\n🧠 Knowledge Base Stats:")
        print(f"  Total Patterns: {kb_stats['total_patterns']}")
        print(f"  High Confidence: {kb_stats['high_confidence_patterns']}")
        print(f"  Total Endpoints: {kb_stats['total_endpoints']}")
        print(f"  Analyses Run: {kb_stats['total_analyses']}")

        if report['new_discoveries']:
            print(f"\n🆕 New Discoveries (top 5):")
            for disc in report['new_discoveries'][:5]:
                print(f"  - {disc['path']} (confidence: {disc['confidence']:.2f})")

        if report['anomalies']:
            print(f"\n⚠️  Anomalies:")
            for anom in report['anomalies'][:5]:
                print(f"  - [{anom['severity']}] {anom['type']}: {anom['endpoint'][:60]}")

    def train_interactive(self):
        """Interactive training mode"""
        print(f"\n🎓 Interactive Training Mode")
        print(f"="*80)

        cursor = self.kb.conn.cursor()
        cursor.execute("""
            SELECT path, confidence FROM endpoints 
            WHERE confidence < 0.7 
            ORDER BY RANDOM() 
            LIMIT 10
        """)

        for path, confidence in cursor.fetchall():
            print(f"\n📍 Endpoint: {path}")
            print(f"   Current confidence: {confidence:.2f}")

            feedback = input("   Feedback (c=correct/f=false/m=missed/s=skip): ").strip().lower()

            if feedback == 'c':
                self.kb.add_feedback(path, 'correct')
                print("   ✓ Marked as correct, confidence increased")
            elif feedback == 'f':
                self.kb.add_feedback(path, 'false_positive')
                print("   ✗ Marked as false positive, confidence decreased")
            elif feedback == 'm':
                comment = input("   What was missed? ")
                self.kb.add_feedback(path, 'missed', comment)
                print("   📝 Feedback recorded")
            elif feedback == 's':
                continue
            else:
                print("   Skipped")

    def export_learned_patterns(self, output_path: str):
        """Export learned patterns для переиспользования"""
        patterns = self.kb.get_learned_patterns(min_confidence=0.6)

        export_data = {
            'exported_at': datetime.now().isoformat(),
            'total_patterns': len(patterns),
            'patterns': [asdict(p) for p in patterns],
            'stats': self.kb.get_stats()
        }

        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)

        print(f"✓ Exported {len(patterns)} patterns to {output_path}")

    def close(self):
        self.kb.close()


def main():
    import sys

    if len(sys.argv) < 2:
        print("""
Usage:
    python har_agent.py analyze <har_file>       # Analyze with learning
    python har_agent.py train                     # Interactive training
    python har_agent.py export <output.json>      # Export learned patterns
    python har_agent.py stats                     # Show knowledge base stats
        """)
        sys.exit(1)

    command = sys.argv[1]
    agent = HARAgent()

    try:
        if command == 'analyze':
            if len(sys.argv) < 3:
                print("Error: HAR file path required")
                sys.exit(1)

            report = agent.analyze_har(sys.argv[2], learn=True)

            # Save report
            report_path = f"har_agent_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\n💾 Report saved: {report_path}")

        elif command == 'train':
            agent.train_interactive()

        elif command == 'export':
            output = sys.argv[2] if len(sys.argv) > 2 else 'learned_patterns.json'
            agent.export_learned_patterns(output)

        elif command == 'stats':
            stats = agent.kb.get_stats()
            print(f"\n📊 Knowledge Base Statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")

        else:
            print(f"Unknown command: {command}")

    finally:
        agent.close()


if __name__ == "__main__":
    main()
