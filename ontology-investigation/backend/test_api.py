"""Quick API test script."""
import sys
from app.db.database import SessionLocal
from app.services.graph_service import GraphService

# Test graph service directly
db = SessionLocal()
try:
    service = GraphService(db)

    # Test perspective view
    print("Testing perspective view for 'financial'...")
    try:
        result = service.get_perspective_view("financial")
        if result:
            print(f"✓ Got perspective view with {len(result.get('metrics', []))} metrics")
        else:
            print("✗ No result returned")
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

    # Test process flow
    print("\nTesting process flow for 'month_end_close'...")
    try:
        result = service.get_process_flow("month_end_close")
        if result:
            print(f"✓ Got process flow with {len(result.get('nodes', []))} nodes")
        else:
            print("✗ No result returned")
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

finally:
    db.close()
