import sys
import json
from pathlib import Path

# Ensure project root and backend are in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.app.database.init_db import init_db
from backend.app.ingestion.indexer import IngestionPipeline


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.ingestion [ingest|status|reindex]")
        sys.exit(1)

    command = sys.argv[1].lower()
    init_db()
    pipeline = IngestionPipeline()

    if command == "ingest":
        print("Starting corpus ingestion pipeline...")
        result = pipeline.ingest_all(force_reindex=False)
        print(json.dumps(result, indent=2))
    elif command == "reindex":
        print("Forcing full re-indexing of reference corpus...")
        result = pipeline.ingest_all(force_reindex=True)
        print(json.dumps(result, indent=2))
    elif command == "status":
        status = pipeline.get_status()
        print(json.dumps(status, indent=2))
    else:
        print(f"Unknown command: {command}. Expected 'ingest', 'reindex', or 'status'.")
        sys.exit(1)


if __name__ == "__main__":
    main()
