"""Root conftest.py: isolate per-service src imports to prevent cross-service conflicts.

Services such as auth-service, gateway, and knowledge-api all expose a top-level
``src`` package.  When pytest collects all of them in a single run the module-level
``sys.path.insert`` calls in each test file leave all service directories in
``sys.path``, meaning subsequent imports of ``src.app`` can resolve to the wrong
service.  The autouse fixture below resets ``sys.modules`` and reorders
``sys.path`` before every test so each test always imports from its own service.
"""

import os
import sys
from pathlib import Path

import pytest

# Provide a safe default secret key for auth-service tests so that
# AuthSettings() does not raise during module-level initialisation.
os.environ.setdefault("AUTH_SECRET_KEY", "test-only-secret-key-32-characters!")


@pytest.fixture(autouse=True)
def _isolate_service_src(request: pytest.FixtureRequest) -> None:
    """Ensure each test imports ``src.*`` from its own service directory."""
    test_file = Path(str(request.fspath))
    # test files live at: <project>/<area>/<service>/tests/test_*.py
    # service root is the grandparent of the test file
    service_root = str(test_file.parent.parent)

    # Clear any previously cached src modules
    for key in list(sys.modules.keys()):
        if key == "src" or key.startswith("src."):
            del sys.modules[key]

    # Move this service's root to the front of sys.path
    if service_root in sys.path:
        sys.path.remove(service_root)
    sys.path.insert(0, service_root)
